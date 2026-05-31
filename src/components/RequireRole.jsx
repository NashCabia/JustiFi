import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDashboardPath } from '../services/justifiFirebase.js';

export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && (user.role || 'student') !== role) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return children;
}
