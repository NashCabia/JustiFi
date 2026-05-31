import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { db } from '../../services/firebaseClient.js';


function useQueryParam(name) {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }, [location.search, name]);
}

function normalizeQuizValue(value) {
  if (typeof value === 'number') return value;
  const raw = value?.score;
  const num = Number(raw);
  return Number.isNaN(num) ? 0 : num;
}

export default function TeacherStudentView() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const studentId = useQueryParam('id') || useQueryParam('uid');

  const [student, setStudent] = useState(null);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');

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

  function showFloatingPanel(message, type = 'success') {
    setFloatingMessage(String(message || ''));
    setFloatingType(type);
    window.setTimeout(() => setFloatingMessage(''), 3000);
  }

  useEffect(() => {
    if (!studentId) {
      setStudent(null);
      showFloatingPanel('No student id provided.', 'error');
      return;
    }

    let unsubscribe = null;

    async function start() {
      try {
        const ref = doc(db, 'users', studentId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          // fallback lookup by email
          const maybeEmail = decodeURIComponent(studentId || '');
          if (maybeEmail.includes('@')) {
            const q = await getDocs(
              query(collection(db, 'users'), where('email', '==', maybeEmail.toLowerCase().trim()), limit(1))
            );
            if (!q.empty) {
              const d = q.docs[0];
              setStudent({ id: d.id, ...d.data() });
              unsubscribe = onSnapshot(doc(db, 'users', d.id), (s) => {
                setStudent(s.exists() ? { id: s.id, ...s.data() } : null);
              });
              return;
            }
          }

          setStudent(null);
          showFloatingPanel('Student not found in Firebase.', 'error');
          return;
        }

        setStudent({ id: snap.id, ...snap.data() });
        unsubscribe = onSnapshot(ref, (s) => {
          setStudent(s.exists() ? { id: s.id, ...s.data() } : null);
        });
      } catch (err) {
        console.error(err);
        setStudent(null);
        showFloatingPanel('Failed to load student.', 'error');
      }
    }

    start();

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [studentId]);

  const overview = useMemo(() => {
    const current = student || {};
    const fullName =
      current.fullName ||
      [current.firstName, current.lastName].filter(Boolean).join(' ').trim() ||
      current.email ||
      'Student';

    const progressData = Array.isArray(current.progress) ? current.progress : [];
    const completedLessons = progressData.length;
    const badgeCount = Array.isArray(current.badges) ? current.badges.length : 0;

    const quizScoresRaw = Array.isArray(current.quizScores) ? current.quizScores : progressData;
    const quizScores = quizScoresRaw.map(normalizeQuizValue);
    const quizAverage = quizScores.length
      ? Math.round(quizScores.reduce((a, b) => a + Number(b || 0), 0) / quizScores.length)
      : 0;

    return { fullName, completedLessons, badgeCount, quizAverage, quizScores };
  }, [student]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const labels = overview.quizScores.map((_, i) => `Quiz ${i + 1}`);

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Quiz Score',
            data: overview.quizScores,
            borderWidth: 2,
            tension: 0.3,
            borderColor: '#1c1132',
            backgroundColor: 'rgba(28, 17, 50, 0.12)'
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
          }
        },
        scales: {
          x: {
            ticks: { color: '#1c1132' },
            grid: { color: 'rgba(0,0,0,0.08)' }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#1c1132' },
            grid: { color: 'rgba(0,0,0,0.08)' }
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
  }, [overview.quizScores]);

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Student View
          </a>
        </div>
      </header>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/teacher/students'); }}>
          Back
        </a>
      </div>

      <main className="students-shell">
        <section className="hero-card">
          <p className="eyebrow">STUDENT PROGRESS</p>
          <h1 id="student-name">{overview.fullName}</h1>
          <p className="hero-subtext">This page shows the selected student’s progress, scores, and achievements.</p>
        </section>

        <section className="list-card">
          <div className="list-header">
            <h2>Progress Overview</h2>
          </div>

          <div className="stats-grid-progress">
            <div className="progress-mini-card">
              <span className="mini-label">Completed Lessons</span>
              <strong id="completedLessons">{overview.completedLessons}</strong>
            </div>

            <div className="progress-mini-card">
              <span className="mini-label">Badges Earned</span>
              <strong id="badgeCount">{overview.badgeCount}</strong>
            </div>

            <div className="progress-mini-card">
              <span className="mini-label">Quiz Average</span>
              <strong id="quizAverage">{overview.quizAverage}%</strong>
            </div>
          </div>

          <div className="chart-box">
            <canvas id="progressChart" ref={canvasRef} />
          </div>
        </section>
      </main>

      <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </>
  );
}
