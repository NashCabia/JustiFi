import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { subscribeToUsers, updateUserRoleByEmail } from '../../services/justifiFirebase.js';


export default function AssignRoles() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [selected, setSelected] = useState(null);
  const [newRole, setNewRole] = useState('student');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newSection, setNewSection] = useState('');

  const [toast, setToast] = useState({ message: '', type: 'success' });

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

  function showToast(message, type = 'success') {
    setToast({ message: String(message || ''), type });
    window.setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUsers(
      (users) => setAllUsers(Array.isArray(users) ? users : []),
      () => setAllUsers([])
    );

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [user]);

  const filteredUsers = useMemo(() => {
    const term = String(search || '').toLowerCase().trim();
    const role = String(roleFilter || '').toLowerCase().trim();

    let list = (Array.isArray(allUsers) ? allUsers : []).filter((u) => (u.role || 'student') !== 'developer');

    if (role) list = list.filter((u) => (u.role || 'student') === role);

    if (term) {
      list = list.filter((u) => {
        const email = String(u.email || '').toLowerCase();
        const firstName = String(u.firstName || '').toLowerCase();
        const lastName = String(u.lastName || '').toLowerCase();
        return email.includes(term) || firstName.includes(term) || lastName.includes(term);
      });
    }

    return list;
  }, [allUsers, search, roleFilter]);

  function onSelect(u) {
    setSelected(u);
    setNewRole(u.role || 'student');
    setNewGradeLevel(u.assignedGradeLevel || '');
    setNewSection(u.assignedSection || '');
  }

  async function onSubmit() {
    const email = selected?.email;
    if (!email) {
      showToast('Email is required', 'error');
      return;
    }

    try {
      await updateUserRoleByEmail(email, newRole, newGradeLevel, newSection);
      showToast('Role updated successfully!', 'success');
      setSelected(null);
    } catch (err) {
      console.error(err);
      showToast(`Error updating role: ${err?.message || 'Unknown error'}`, 'error');
    }
  }

  if (loading) return null;

  const showTeacherFields = newRole === 'teacher';

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>
        <div className="topbar-right">
          <span className="welcome">Assign Roles</span>
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
          <h1>Assign Roles</h1>
          <p className="hero-subtext">Update a user account role. Works with Firebase when configured.</p>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Assign Roles</h2>
          </div>

          <div className="search-filter-section">
            <div className="search-box">
              <input
                className="search-input"
                type="text"
                id="searchInput"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="search-btn" type="button" aria-label="Search">
                Search
              </button>
            </div>

            <div className="filter-box">
              <label htmlFor="roleFilter">Filter by Role:</label>
              <select
                className="role-select"
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="developer">Developer</option>
              </select>
            </div>
          </div>

          <div className="users-list-container">
            <div id="usersList" className="users-list">
              {filteredUsers.map((u) => (
                <div key={u.id || u.email} className="user-item" data-email={u.email || ''} onClick={() => onSelect(u)}>
                  <div className="user-info">
                    <div className="user-name">{u.firstName || ''} {u.lastName || ''}</div>
                    <div className="user-email">{u.email || ''}</div>
                    <div className="user-role">Role: <strong>{u.role || 'student'}</strong></div>
                  </div>
                  <button className="select-btn" type="button">Select</button>
                </div>
              ))}
            </div>

            <div id="noUsersMessage" className="no-users-message" style={{ display: filteredUsers.length ? 'none' : 'block' }}>
              <p>No users found. Try adjusting your search or filter.</p>
            </div>
          </div>

          <div id="roleAssignmentForm" className={['role-assignment-form', selected ? '' : 'hidden'].join(' ')}>
            <div className="form-header">
              <h3>
                Update Role for <span id="selectedUserName">{selected ? `${selected.firstName || ''} ${selected.lastName || ''}`.trim() || selected.email : ''}</span>
              </h3>
              <button className="close-form-btn" type="button" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className="form-content">
              <div className="form-field">
                <label htmlFor="selectedEmail">Email:</label>
                <input type="email" id="selectedEmail" readOnly value={selected?.email || ''} />
              </div>

              <div className="form-field">
                <label htmlFor="newRole">New Role:</label>
                <select id="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div className="form-field" id="gradeField" style={{ display: showTeacherFields ? 'block' : 'none' }}>
                <label htmlFor="newGradeLevel">Grade Level (for teachers):</label>
                <input
                  type="text"
                  id="newGradeLevel"
                  placeholder="Example: Grade 10"
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(e.target.value)}
                />
              </div>

              <div className="form-field" id="sectionField" style={{ display: showTeacherFields ? 'block' : 'none' }}>
                <label htmlFor="newSection">Section (for teachers):</label>
                <input
                  type="text"
                  id="newSection"
                  placeholder="Example: Section A"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                />
              </div>

              <button className="assign-btn" id="submitRoleBtn" type="button" onClick={onSubmit}>
                Update Role
              </button>
            </div>
          </div>

          <div className="status-note">Search and select a user to update their role.</div>
        </section>
      </main>

      {toast.message ? (
        <div
          id="notificationPanel"
          style={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            padding: '16px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            backgroundColor: toast.type === 'error' ? '#f44336' : toast.type === 'info' ? '#2196f3' : '#4caf50',
            color: '#fff'
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
