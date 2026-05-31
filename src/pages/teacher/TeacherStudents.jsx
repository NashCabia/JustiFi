import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getStudents, logout } from '../../services/justifiFirebase.js';


function getAverageProgress(student) {
  const progress = Array.isArray(student?.progress) ? student.progress : [];
  if (!progress.length) return 0;
  const total = progress.reduce((sum, v) => sum + Number((v?.score ?? v) || 0), 0);
  return total / progress.length;
}

export default function TeacherStudents() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [progressSort, setProgressSort] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');

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

  const filtered = useMemo(() => {
    const keyword = String(search || '').toLowerCase().trim();
    const gradeKey = String(grade || '').toLowerCase().trim();
    const sectionKey = String(section || '').toLowerCase().trim();

    let list = (Array.isArray(students) ? students : []).filter((student) => {
      const fullName =
        student.fullName ||
        [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ').trim() ||
        '';

      const matchesName = !keyword || fullName.toLowerCase().includes(keyword);
      const matchesGrade = !gradeKey || String(student.gradeLevel || '').toLowerCase().includes(gradeKey);
      const matchesSection = !sectionKey || String(student.section || '').toLowerCase().includes(sectionKey);
      return matchesName && matchesGrade && matchesSection;
    });

    if (progressSort === 'high') {
      list = list.slice().sort((a, b) => getAverageProgress(b) - getAverageProgress(a));
    }
    if (progressSort === 'low') {
      list = list.slice().sort((a, b) => getAverageProgress(a) - getAverageProgress(b));
    }

    return list;
  }, [students, search, progressSort, grade, section]);

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
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Student List
          </a>
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
          <button className="menu-link" onClick={() => navigate('/dashboard/teacher')}>Dashboard</button>
          <button className="menu-link" onClick={() => navigate('/teacher/profile')}>Profile</button>
          <button className="menu-link logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/teacher'); }}>
          Back
        </a>
      </div>

      <main className="students-shell">
        <section className="hero-card">
          <p className="eyebrow">STUDENT LIST</p>
          <h1>Registered Students</h1>
          <p className="hero-subtext">
            Select a student from the list below to view their learning progress, scores, and achievements.
          </p>
        </section>

        <section className="list-card">
          <div className="list-header">
            <h2>Students</h2>
            <div className="filters-container">
              <input
                type="text"
                id="studentSearch"
                className="search-input"
                placeholder="Search student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                id="progressFilter"
                className="search-input"
                value={progressSort}
                onChange={(e) => setProgressSort(e.target.value)}
              >
                <option value="">Progress: Default</option>
                <option value="high">Highest Progress</option>
                <option value="low">Lowest Progress</option>
              </select>
              <input
                type="text"
                id="gradeFilter"
                className="search-input"
                placeholder="Filter grade..."
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
              <input
                type="text"
                id="sectionFilter"
                className="search-input"
                placeholder="Filter section..."
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </div>
          </div>

          <div id="student-list" className="student-list">
            {!filtered.length ? (
              <div className="empty-state">No students found.</div>
            ) : (
              filtered.map((student, idx) => {
                const fullName =
                  student.fullName ||
                  [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ').trim() ||
                  student.email ||
                  `Student ${idx + 1}`;
                const email = student.email || 'No email available';
                const role = student.role || 'student';
                const id = student.id || student.uid || `student-${idx + 1}`;

                return (
                  <div
                    key={id}
                    className="student-card"
                    onClick={() => navigate(`/teacher/students/view?id=${encodeURIComponent(id)}`)}
                  >
                    <div className="student-main">
                      <h3>{fullName}</h3>
                      <p>{email}</p>
                      <p>Role: {role}</p>
                    </div>
                    <div className="student-action">View Progress →</div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </>
  );
}
