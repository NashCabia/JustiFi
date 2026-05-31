import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, logout, subscribeToUsers } from '../../services/justifiFirebase.js';


export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState({
    totalUsers: 0,
    studentAccounts: 0,
    teacherAccounts: 0,
    developerAccounts: 0
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if ((user.role || 'student') !== 'developer') {
      navigate('/dashboard/student', { replace: true });
    }
  }, [loading, user, navigate]);

  const devName = useMemo(() => getDisplayName(user) || 'Developer', [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUsers(
      (allUsers) => {
        const users = Array.isArray(allUsers) ? allUsers : [];
        const nonDevUsers = users.filter((u) => (u.role || 'student') !== 'developer');
        setCounts({
          totalUsers: nonDevUsers.length,
          studentAccounts: nonDevUsers.filter((u) => (u.role || 'student') === 'student').length,
          teacherAccounts: nonDevUsers.filter((u) => (u.role || 'student') === 'teacher').length,
          developerAccounts: users.filter((u) => (u.role || 'student') === 'developer').length
        });
      },
      () => {
        setCounts({ totalUsers: 0, studentAccounts: 0, teacherAccounts: 0, developerAccounts: 0 });
      }
    );

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [user]);

  async function onLogout() {
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate('/login', { replace: true });
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
            Welcome, <strong id="navUserName">{devName}</strong>
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
          <button className="menu-link" onClick={() => navigate('/developer/assign-roles')}>Assign Roles</button>
          <button className="menu-link" onClick={() => navigate('/developer/manage-accounts')}>Manage Accounts</button>
          <button className="menu-link" onClick={() => navigate('/developer/update-announcement')}>Update Announcement</button>
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
          <p className="eyebrow">JUSTIFI DEVELOPER DASHBOARD</p>
          <h1>
            Hello, <span id="heroDevName">{devName}</span>
          </h1>
          <p className="hero-subtext">
            Manage roles, organize accounts, and configure the developer-side controls of the JustiFi system.
          </p>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Users</span>
            <strong className="stat-value" id="totalUsers">{counts.totalUsers}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Student Accounts</span>
            <strong className="stat-value" id="studentAccounts">{counts.studentAccounts}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Teacher Accounts</span>
            <strong className="stat-value" id="teacherAccounts">{counts.teacherAccounts}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Developer Accounts</span>
            <strong className="stat-value" id="developerAccounts">{counts.developerAccounts}</strong>
          </div>
        </section>

        <section className="content-card">
          <p className="card-kicker">QUICK ACCESS</p>
          <h2>Main Developer Tools</h2>

          <div className="action-grid">
            <button className="feature-card" onClick={() => navigate('/developer/assign-roles')}>
              <h3>Assign Roles</h3>
              <p>Promote users or change account roles inside the system.</p>
            </button>

            <button className="feature-card" onClick={() => navigate('/developer/manage-accounts')}>
              <h3>Manage Accounts</h3>
              <p>View, organize, and monitor registered user accounts.</p>
            </button>

            <button className="feature-card" onClick={() => navigate('/developer/update-announcement')}>
              <h3>Update Announcement</h3>
              <p>Create, edit, and manage system announcements.</p>
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
