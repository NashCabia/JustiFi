import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';


export default function SystemSettings() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

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

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/developer'); }}>
          <img className="brand-logo" src="/assets/Title/JustiFiLogo.png" alt="JustiFi logo" />
        </a>

        <div className="topbar-right">
          <span className="welcome">System Settings</span>
        </div>
      </header>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/developer'); }}>
          Back
        </a>
      </div>

      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">DEVELOPER TOOL</p>
          <h1>System Settings</h1>
          <p className="hero-subtext">This page is reserved for future system settings.</p>
        </section>

        <section className="settings-grid">
          <div className="settings-card">
            <h2>Coming Soon</h2>
            <div className="note-box">System settings controls will appear here once configured.</div>
          </div>
        </section>
      </main>
    </>
  );
}
