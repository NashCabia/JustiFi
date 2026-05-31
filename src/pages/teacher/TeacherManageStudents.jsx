import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getStudents, updateUserProfileById } from '../../services/justifiFirebase.js';


export default function TeacherManageStudents() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [edit, setEdit] = useState({
  gradeLevel: 'Grade 11',
  section: ''
});

  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');

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

  async function load() {
    try {
      if (!user) return;
      const rows = await getStudents(user);
      setAllStudents(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setAllStudents([]);
      showFloatingPanel('Failed to load students.', 'error');
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const term = String(search || '').toLowerCase().trim();
    const grade = String(gradeFilter || '').trim();

    let list = Array.isArray(allStudents) ? allStudents : [];

    if (term) {
      list = list.filter((s) => {
        const email = String(s.email || '').toLowerCase();
        const firstName = String(s.firstName || '').toLowerCase();
        const lastName = String(s.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        return email.includes(term) || firstName.includes(term) || lastName.includes(term) || fullName.includes(term);
      });
    }

    if (grade) {
      list = list.filter((s) => String(s.gradeLevel || '') === grade);
    }

    return list;
  }, [allStudents, search, gradeFilter]);

  function openEditModal(student) {
   setEdit({
  gradeLevel: student.gradeLevel || 'Grade 11',
  section: student.section || ''
});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedStudent(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedStudent?.id) {
      showFloatingPanel('No student selected', 'error');
      return;
    }

    setSaving(true);
    try {
      const updates = {
  gradeLevel: String(edit.gradeLevel || ''),
  section: String(edit.section || '').trim()
};

await updateUserProfileById(selectedStudent.id, updates);

      await updateUserProfileById(selectedStudent.id, {
        ...updates,
        fullName: `${updates.firstName} ${updates.lastName}`.trim()
      });

      showFloatingPanel('Student information updated successfully!', 'success');
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      showFloatingPanel(`Failed to update student: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/teacher'); }}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <span className="welcome">Manage Students</span>
        </div>
      </header>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/teacher'); }}>
          Back
        </a>
      </div>

      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">ADMIN MANAGEMENT</p>
          <h1>Manage Students</h1>
          <p className="hero-subtext">Edit student grade levels, sections, and other academic information.</p>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Find Student</h2>
          </div>

          <div className="search-filter-section">
            <div className="search-box">
              <input
                className="search-input"
                type="text"
                id="searchInput"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="search-btn" type="button" aria-label="Search" onClick={() => null}>
                Search
              </button>
            </div>

            <div className="filter-box">
              <label htmlFor="gradeFilter">Filter by Grade:</label>
              <select
                className="grade-select"
                id="gradeFilter"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="">All Grades</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Students</h2>
            <span id="studentCount" className="student-count">
              {filtered.length} {filtered.length === 1 ? 'student' : 'students'}
            </span>
          </div>

          <div id="studentsList" className="students-list">
            {filtered.map((student) => {
              const id = student.id || student.uid;
              return (
                <div key={id} className="student-item" onClick={() => openEditModal(student)}>
                  <div className="student-item-info">
                    <div className="student-item-name">
                      {student.firstName || ''} {student.lastName || ''}
                    </div>
                    <div className="student-item-details">
                      <span>{student.email}</span>
                      <span>{student.gradeLevel || 'N/A'}</span>
                      <span>{student.section || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="student-item-badge">{student.role}</div>
                </div>
              );
            })}
          </div>

          <div id="emptyState" className="empty-state" style={{ display: filtered.length ? 'none' : 'block' }}>
            <p>No students found. Try adjusting your search or filter.</p>
          </div>
        </section>

        <div id="editFormModal" className={['modal', modalOpen ? '' : 'hidden'].join(' ')}>
          <div className="modal-overlay" onClick={closeModal} />
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                Edit Student - <span id="studentNameDisplay">{selectedStudent ? `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`.trim() : ''}</span>
              </h2>
              <button className="close-btn" type="button" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form id="editStudentForm" className="edit-form" onSubmit={onSubmit}>
              <div className="form-group">
                <label htmlFor="editEmail">Email:</label>
<input
  type="email"
  id="editEmail"
  readOnly
  className="readonly-field"
  value={selectedStudent?.email || ""}
/>
              </div>

              <div className="form-group">
                <label htmlFor="editFirstName">First Name:</label>
                <input
  type="text"
  id="editFirstName"
  readOnly
  className="readonly-field"
  value={selectedStudent?.firstName || ""}
/>  
              </div>

              <div className="form-group">
                <label htmlFor="editLastName">Last Name:</label>
                <input
  type="text"
  id="editLastName"
  readOnly
  className="readonly-field"
  value={selectedStudent?.lastName || ""}
/>
              </div>

              <div className="form-group">
                <label htmlFor="editGradeLevel">Grade Level:</label>
                <select
                  id="editGradeLevel"
                  value={edit.gradeLevel}
                  onChange={(e) => setEdit((s) => ({ ...s, gradeLevel: e.target.value }))}
                >
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editSection">Section:</label>
                <input
                  type="text"
                  id="editSection"
                  placeholder="Example: Section A"
                  value={edit.section}
                  onChange={(e) => setEdit((s) => ({ ...s, section: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="editSchool">School:</label>
<input
  type="text"
  id="editSchool"
  readOnly
  className="readonly-field"
  value={selectedStudent?.school || ""}
/>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-secondary" type="button" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
          <span id="floatingPanelMessage">{floatingMessage}</span>
        </div>
      </main>
    </>
  );
}
