import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RequireRole from './components/RequireRole.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import StudentDashboard from './pages/dashboards/StudentDashboard.jsx';
import TeacherDashboard from './pages/dashboards/TeacherDashboard.jsx';
import DeveloperDashboard from './pages/dashboards/DeveloperDashboard.jsx';
import StudentProfile from './pages/student/StudentProfile.jsx';
import StudentBadges from './pages/student/StudentBadges.jsx';
import TeacherProfile from './pages/teacher/TeacherProfile.jsx';
import TeacherStudents from './pages/teacher/TeacherStudents.jsx';
import TeacherManageStudents from './pages/teacher/TeacherManageStudents.jsx';
import TeacherStudentView from './pages/teacher/TeacherStudentView.jsx';
import AssignRoles from './pages/developer/AssignRoles.jsx';
import ManageAccounts from './pages/developer/ManageAccounts.jsx';
import SystemSettings from './pages/developer/SystemSettings.jsx';
import UpdateAnnouncement from './pages/developer/UpdateAnnouncement.jsx';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/team" element={<TeamPage />} />

        <Route
          path="/dashboard/student"
          element={
            <RequireRole role="student">
              <StudentDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/teacher"
          element={
            <RequireRole role="teacher">
              <TeacherDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/developer"
          element={
            <RequireRole role="developer">
              <DeveloperDashboard />
            </RequireRole>
          }
        />

        <Route
          path="/student/profile"
          element={
            <RequireRole role="student">
              <StudentProfile />
            </RequireRole>
          }
        />
        <Route
          path="/student/badges"
          element={
            <RequireRole role="student">
              <StudentBadges />
            </RequireRole>
          }
        />

        <Route
          path="/teacher/profile"
          element={
            <RequireRole role="teacher">
              <TeacherProfile />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <RequireRole role="teacher">
              <TeacherStudents />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/manage-students"
          element={
            <RequireRole role="teacher">
              <TeacherManageStudents />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/students/view"
          element={
            <RequireRole role="teacher">
              <TeacherStudentView />
            </RequireRole>
          }
        />

        <Route
          path="/developer/assign-roles"
          element={
            <RequireRole role="developer">
              <AssignRoles />
            </RequireRole>
          }
        />
        <Route
          path="/developer/manage-accounts"
          element={
            <RequireRole role="developer">
              <ManageAccounts />
            </RequireRole>
          }
        />
        <Route
          path="/developer/system-settings"
          element={
            <RequireRole role="developer">
              <SystemSettings />
            </RequireRole>
          }
        />
        <Route
          path="/developer/update-announcement"
          element={
            <RequireRole role="developer">
              <UpdateAnnouncement />
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
