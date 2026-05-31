import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';


export default function ManageAccounts() {
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
          <span className="welcome">Manage Accounts</span>
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
          <h1>Manage Accounts</h1>
          <p className="hero-subtext">This page is reserved for future account management tools.</p>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Account Tools</h2>
            <div className="toolbar">
              <input className="search-input" type="text" placeholder="Search (coming soon)" disabled />
              <select className="filter-select" disabled>
                <option>All roles (coming soon)</option>
              </select>
            </div>
          </div>

          <div className="empty-state">No account tools configured yet.</div>
        </section>
      </main>
    </>
  );
}
