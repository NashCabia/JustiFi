import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';


const BADGES = [
  { id: 'starter', alt: 'Starter badge', src: '/assets/Badges/badge1.png' },
  { id: 'quiz_rookie', alt: 'Quiz Rookie badge', src: '/assets/Badges/badge2.png' },
  { id: 'consistent', alt: 'Consistent badge', src: '/assets/Badges/badge3.png' },
  { id: 'achievement', alt: 'Achievement badge', src: '/assets/Badges/badge4.png' }
];

export default function StudentBadges() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  const earned = useMemo(() => new Set(Array.isArray(user?.badges) ? user.badges : []), [user]);

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Badges
          </a>
        </div>
      </header>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/student'); }}>
          Back
        </a>
      </div>

      <div className="badges-page">
        <h1>Your Badges</h1>
        <div className="badges-grid">
          {BADGES.map((b, idx) => {
            const isEarned = idx === 0 ? true : earned.has(b.id);
            return (
              <div key={b.id} className={['badge', isEarned ? '' : 'locked'].join(' ').trim()}>
                <img className="badge-img" alt={b.alt} src={b.src} />
              </div>
            );
          })}
        </div>
      </div>

    </>
  );
}
