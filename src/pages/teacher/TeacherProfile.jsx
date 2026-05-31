import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, logout, updateCurrentUserProfile } from '../../services/justifiFirebase.js';


const DEFAULT_AVATAR = '/assets/Profile/default-avatar.webp';

function formatValue(value) {
  if (!value) return 'Not available';
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString();
  } catch {
    return 'Not available';
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export default function TeacherProfile() {
  const navigate = useNavigate();
  const { user, setUser, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    adminId: '',
    department: '',
    position: '',
    school: ''
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if ((user.role || 'student') !== 'teacher') {
      navigate('/dashboard/student', { replace: true });
      return;
    }

    setForm({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      adminId: user.adminId || '',
      department: user.department || '',
      position: user.position || '',
      school: user.school || ''
    });
  }, [loading, user, navigate]);

  const displayName = useMemo(() => getDisplayName(user) || user?.email || 'Admin', [user]);
  const profileImageSrc = useMemo(() => {
    return user?.profileImage?.localPath || user?.avatarDataUrl || DEFAULT_AVATAR;
  }, [user]);

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

  async function onSave() {
    if (!user) return;

    const firstName = String(form.firstName || '').trim();
    const middleName = String(form.middleName || '').trim();
    const lastName = String(form.lastName || '').trim();

    if (!firstName || !lastName) {
      showFloatingPanel('First name and last name are required.', 'error');
      return;
    }

    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const patch = {
      firstName,
      middleName,
      lastName,
      fullName,
      adminId: String(form.adminId || '').trim(),
      department: String(form.department || '').trim(),
      position: String(form.position || '').trim(),
      school: String(form.school || '').trim()
    };

    const isComplete =
      patch.firstName && patch.lastName && patch.adminId && patch.department && patch.position && patch.school;

    setSaving(true);
    try {
      const updatedUser = await updateCurrentUserProfile({
        ...patch,
        profileCompleted: !!isComplete
      });
      setUser?.(updatedUser);
      showFloatingPanel('Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      showFloatingPanel('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onProfileImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showFloatingPanel('Please select an image file only.', 'error');
      e.target.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const updatedUser = await updateCurrentUserProfile({
        profileImage: {
          localPath: dataUrl,
          cloudUrl: ''
        }
      });
      setUser?.(updatedUser);
    } catch (err) {
      console.error(err);
      showFloatingPanel('Failed to update profile image.', 'error');
    } finally {
      e.target.value = '';
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
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Profile
          </a>
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
          <button className="menu-link" onClick={() => navigate('/teacher/students')}>Student List</button>
          <button className="menu-link logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/teacher'); }}>
          Back
        </a>
      </div>

      <main className="profile-shell">
        <section className="profile-card">
          <div className="profile-image-wrap">
            <img id="profileImage" className="profile-img" src={profileImageSrc} alt="Profile photo" />
            <label htmlFor="profileImageInput" className="image-upload-btn" aria-label="Change photo">
              <img className="image-upload-icon" src="/assets/Icons/edit.png" alt="" aria-hidden="true" />
            </label>
          </div>
          <input
            id="profileImageInput"
            className="image-upload-input"
            type="file"
            accept="image/*"
            onChange={onProfileImageChange}
          />

          <h2 id="profileDisplayName">{displayName}</h2>
          <p id="userRole">Admin</p>
          <p id="userStatus" className="sub-info">
            {user?.profileCompleted ? 'Profile Completed' : 'Complete your profile'}
          </p>
        </section>

        <section className="info-card">
          <div className="section-head">
            <h3>Personal Information</h3>
          </div>

          <form id="profileForm" className="info-grid" onSubmit={(e) => e.preventDefault()}>
            <div className="info-row">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                className="profile-input"
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="middleName">Middle Name (optional)</label>
              <input
                id="middleName"
                className="profile-input"
                type="text"
                value={form.middleName}
                onChange={(e) => setForm((s) => ({ ...s, middleName: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                className="profile-input"
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="adminId">Admin ID</label>
              <input
                id="adminId"
                className="profile-input"
                type="text"
                value={form.adminId}
                onChange={(e) => setForm((s) => ({ ...s, adminId: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                className="profile-input"
                type="text"
                value={form.department}
                onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="position">Position</label>
              <input
                id="position"
                className="profile-input"
                type="text"
                value={form.position}
                onChange={(e) => setForm((s) => ({ ...s, position: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="school">School</label>
              <input
                id="school"
                className="profile-input"
                type="text"
                value={form.school}
                onChange={(e) => setForm((s) => ({ ...s, school: e.target.value }))}
              />
            </div>

            <div className="info-row readonly-row">
              <span>Email</span>
              <strong id="email">{user?.email || 'Not available'}</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Role</span>
              <strong id="roleField">Teacher</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Account Status</span>
              <strong id="accountStatus">{(user?.accountStatus || 'active').replace(/^\w/, (m) => m.toUpperCase())}</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Created At</span>
              <strong id="createdAt">{formatValue(user?.createdAt)}</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Last Updated</span>
              <strong id="updatedAt">{formatValue(user?.updatedAt)}</strong>
            </div>
          </form>

          <div className="form-actions">
            <button id="saveProfileBtn" className="edit-btn" type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
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
