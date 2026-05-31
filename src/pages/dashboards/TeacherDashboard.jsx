import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, getStudents, logout } from '../../services/justifiFirebase.js';


function hasAnyProgress(progress) {
  if (!Array.isArray(progress)) return false;
  return progress.some((v) => Number(v?.score ?? v) > 0);
}

function normalizeQuizScorePercent(value) {
  const raw = typeof value === 'number' ? value : value?.score;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num <= 10 ? num * 10 : num;
}

function computeAverageQuizScorePercent(students) {
  let total = 0;
  let count = 0;

  for (const student of students || []) {
    const scores = Array.isArray(student.quizScores) ? student.quizScores : [];
    for (const s of scores) {
      const percent = normalizeQuizScorePercent(s);
      if (percent === null) continue;
      total += percent;
      count += 1;
    }
  }

  return count ? total / count : 0;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');
  const [students, setStudents] = useState([]);

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if ((user.role || 'student') !== 'teacher') {
      navigate('/dashboard/student', { replace: true });
    }
  }, [loading, user, navigate]);

  const adminName = useMemo(() => getDisplayName(user) || 'Admin', [user]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (!user) return;
        const rows = await getStudents(user);
        if (!cancelled) setStudents(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setStudents([]);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const summary = useMemo(() => {
    const list = Array.isArray(students) ? students : [];
    const totalStudents = list.length;
    const activeStudents = list.filter((s) => String(s.accountStatus || 'active').toLowerCase() === 'active').length;
    const completedProfiles = list.filter((s) => !!s.profileCompleted).length;
    const studentsWithProgress = list.filter((s) => hasAnyProgress(s.progress)).length;
    const averageQuizScore = Math.round(computeAverageQuizScorePercent(list));
    const overallCompletion = totalStudents ? Math.round((completedProfiles / totalStudents) * 100) : 0;

    return {
      totalStudents,
      activeStudents,
      completedProfiles,
      studentsWithProgress,
      averageQuizScore,
      overallCompletion
    };
  }, [students]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [
          'Total Students',
          'Active Students',
          'Completed Profiles',
          'Students with Progress',
          'Average Quiz Score'
        ],
        datasets: [
          {
            label: 'Admin Overview',
            data: [
              summary.totalStudents ?? 0,
              summary.activeStudents ?? 0,
              summary.completedProfiles ?? 0,
              summary.studentsWithProgress ?? 0,
              summary.averageQuizScore ?? 0
            ],
            borderWidth: 1,
            borderRadius: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#1c1132'
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw ?? 0;
                return label === 'Average Quiz Score'
                  ? `${label}: ${value}%`
                  : `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#4e4466' },
            grid: { color: 'rgba(28,17,50,0.08)' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#4e4466' },
            grid: { color: 'rgba(28,17,50,0.08)' }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [summary]);

  function showFloatingPanel(message, type = 'success') {
    setFloatingMessage(String(message || ''));
    setFloatingType(type);
    window.setTimeout(() => setFloatingMessage(''), 3000);
  }

  async function onLogout() {
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate('/login', { replace: true });
  }

  function onPrintData() {
    try {
      const list = Array.isArray(students) ? students : [];
      if (!list.length) {
        showFloatingPanel('No student data available to export.', 'error');
        return;
      }

      const summaryRows = [
        { Metric: 'Total Students', Value: list.length },
        {
          Metric: 'Active Students',
          Value: list.filter((s) => String(s.accountStatus || 'active').toLowerCase() === 'active').length
        },
        { Metric: 'Completed Profiles', Value: list.filter((s) => !!s.profileCompleted).length },
        { Metric: 'Students with Progress', Value: list.filter((s) => hasAnyProgress(s.progress)).length },
        { Metric: 'Average Quiz Score', Value: `${Math.round(computeAverageQuizScorePercent(list))}%` }
      ];

      const studentRows = list.map((student) => {
        const progressItems = Array.isArray(student.progress) ? student.progress : [];
        const quizScores = Array.isArray(student.quizScores) ? student.quizScores : [];
        const avg = quizScores.length
          ? Math.round(
              quizScores.reduce((sum, s) => sum + (normalizeQuizScorePercent(s) || 0), 0) / quizScores.length
            )
          : 0;

        return {
          Name:
            student.fullName ||
            [student.firstName, student.lastName].filter(Boolean).join(' ').trim() ||
            student.email ||
            '',
          Email: student.email || '',
          Role: student.role || 'student',
          GradeLevel: student.gradeLevel || '',
          Section: student.section || '',
          Status: student.accountStatus || 'active',
          ProfileCompleted: student.profileCompleted ? 'Yes' : 'No',
          CompletedLessons: progressItems.length,
          BadgeCount: Array.isArray(student.badges) ? student.badges.length : 0,
          QuizAverage: `${avg}%`
        };
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentRows), 'Students');

      const fileName = `student-monitoring-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showFloatingPanel('Student data exported to Excel.', 'success');
    } catch (err) {
      console.error(err);
      showFloatingPanel('Failed to export student data.', 'error');
    }
  }

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <span className="welcome">
            Welcome, <strong id="navAdminName">{adminName}</strong>
          </span>
          <button
            id="menuBtn"
            className="menu-btn"
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      <div
        id="menuOverlay"
        className={['menu-overlay', menuOpen ? '' : 'hidden'].join(' ')}
        onClick={() => setMenuOpen(false)}
      />

      <aside id="sideMenu" className={['side-menu', menuOpen ? 'open' : ''].join(' ')}>
        <div className="side-menu-header">
          <h3>Menu</h3>
          <button id="closeMenuBtn" className="close-menu-btn" type="button" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>

        <div className="side-menu-body">
          <button className="menu-link" onClick={() => navigate('/teacher/profile')}>Profile</button>
          <button className="menu-link" onClick={() => navigate('/teacher/students')}>Student List</button>
          <button className="menu-link" onClick={() => navigate('/teacher/manage-students')}>Manage Students</button>
          <button className="menu-link logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Back
        </a>
      </div>

      <main className="dashboard-shell">
        <section className="hero-card">
          <p className="eyebrow">JUSTIFI ADMIN DASHBOARD</p>
          <h1>
            Hello, <span id="heroAdminName">{adminName}</span>
          </h1>
          <p className="hero-subtext">
            View registered students and monitor their individual learning progress directly from this dashboard.
          </p>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Students</span>
            <strong className="stat-value" id="totalStudents">{summary.totalStudents}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Active Students</span>
            <strong className="stat-value" id="activeStudents">{summary.activeStudents}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Overall Completion</span>
            <strong className="stat-value" id="overallCompletion">{summary.overallCompletion}%</strong>
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-head">
            <div>
              <p className="card-kicker">LIVE FIREBASE DATA</p>
              <h2>Student Monitoring Overview</h2>
            </div>
            <button className="print-data-btn" type="button" onClick={onPrintData}>
              Print Data
            </button>
          </div>
          <div className="chart-wrap">
            <canvas id="adminOverviewChart" ref={canvasRef} />
          </div>
        </section>

        <section className="content-card">
          <p className="card-kicker">QUICK ACCESS</p>
          <h2>Main Sections</h2>

          <div className="action-grid">
            <button className="feature-card" onClick={() => navigate('/teacher/profile')}>
              <h3>Profile</h3>
              <p>View and manage your admin information.</p>
            </button>

            <button className="feature-card" onClick={() => navigate('/teacher/students')}>
              <h3>Student List</h3>
              <p>Select a student to view their progress, scores, and performance.</p>
            </button>

            <button className="feature-card" onClick={() => navigate('/teacher/manage-students')}>
              <h3>Manage Students</h3>
              <p>Manipulate student grades, sections, and academic information.</p>
            </button>
          </div>
        </section>
      </main>

      <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </>
  );
}
