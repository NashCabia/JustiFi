import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, logout } from '../../services/justifiFirebase.js';


function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const displayName = useMemo(() => {
    return (
      safeText(user?.firstName) ||
      safeText(user?.fullName) ||
      safeText(user?.email) ||
      'Student'
    );
  }, [user]);

  const progressItems = Array.isArray(user?.progress) ? user.progress : [];
  const badges = Array.isArray(user?.badges) ? user.badges : [];
  const quizScores = Array.isArray(user?.quizScores) ? user.quizScores : [];

  const completedLessons = progressItems.length;
  const average = quizScores.length
    ? Math.round(quizScores.reduce((sum, row) => sum + (Number(row?.score) || 0), 0) / quizScores.length)
    : 0;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const labels = progressItems.length
      ? progressItems.map((item, index) => item?.moduleTitle || `Module ${index + 1}`)
      : ['No Data'];

    const scores = progressItems.length
      ? progressItems.map((item) => Number(item?.score) || 0)
      : [0];

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
            label: 'Progress Score',
            data: scores,
            borderWidth: 2,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#d6cae2' },
            grid: { color: 'rgba(255,255,255,0.08)' }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#d6cae2' },
            grid: { color: 'rgba(255,255,255,0.08)' }
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
  }, [progressItems]);

  function showFloatingPanel(message, type = 'success') {
    setFloatingMessage(String(message || ''));
    setFloatingType(type);

    window.setTimeout(() => {
      setFloatingMessage('');
    }, 3000);
  }

  async function onLogout() {
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <span className="welcome">Welcome, <strong id="navUserName">{getDisplayName(user) || displayName}</strong></span>

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
          <button className="menu-link" onClick={() => navigate('/student/profile')}>Profile</button>
          <button className="menu-link" onClick={() => navigate('/student/badges')}>Badges</button>
          <button className="menu-link logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <div className="back-row">
        <a className="back-btn" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Back</a>
      </div>

      <main className="dashboard-shell">
        <section className="hero-card">
          <p className="eyebrow">JUSTIFI STUDENT DASHBOARD</p>
          <h1>Hello, <span id="heroUserName">{displayName}</span></h1>
          <p className="hero-subtext">
            Learn legal rights through interactive stories and keep track of your overall progress.
          </p>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Lessons</span>
            <strong className="stat-value" id="lessonCount">{String(completedLessons).padStart(2, '0')}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Badges</span>
            <strong className="stat-value" id="badgeCount">{String(badges.length).padStart(2, '0')}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Average</span>
            <strong className="stat-value" id="quizAverage">{average}%</strong>
          </div>
        </section>

        <section className="content-grid">
          <section className="content-card">
            <p className="card-kicker">QUICK ACCESS</p>
            <h2>Main Sections</h2>

            <div className="action-grid">
              <button className="feature-card" onClick={() => navigate('/student/profile')}>
                <h3>Profile</h3>
                <p>View your personal information and learning record.</p>
              </button>

              <button className="feature-card" onClick={() => navigate('/student/badges')}>
                <h3>Badges</h3>
                <p>See your earned achievements and rewards.</p>
              </button>

              <button
                className="feature-card"
                onClick={() => showFloatingPanel('Quizzes page is coming soon.', 'info')}
              >
                <h3>Quizzes</h3>
                <p>Review your quiz activities and progress scores.</p>
              </button>
            </div>
          </section>

          <section className="content-card chart-card">
            <p className="card-kicker">PROGRESS OVERVIEW</p>
            <h2>Learning Progress</h2>
            <div className="mini-chart-wrap">
              <canvas id="dashboardProgressChart" ref={canvasRef} />
            </div>
          </section>
        </section>
      </main>

      <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </>
  );
}
