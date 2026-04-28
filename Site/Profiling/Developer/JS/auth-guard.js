(function () {
  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  function redirectToLogin(depth = '') {
    window.location.href = `${depth}Login/auth.html`;
  }

  function roleForPath(path) {
    const p = path.toLowerCase();

    if (p.includes('/profiling/userpage/')) return 'student';
    if (p.includes('/profiling/adminpage/')) return 'teacher';
    if (p.includes('/profiling/developer/')) return 'developer';
    return null;
  }

  function redirectByRole(role) {
    if (fb && fb.getDashboardPath) {
      window.location.href = fb.getDashboardPath({ role }, '../../../');
      return;
    }

    if (role === 'teacher') {
      window.location.href = '../../../Profiling/AdminPage/Dashboard/admindash.html';
      return;
    }

    if (role === 'developer') {
      window.location.href = '../../../Profiling/Developer/Dashboard/developer.html';
      return;
    }

    window.location.href = '../../../Profiling/UserPage/Dashboard/dash.html';
  }

  async function protectPage(depth = '../../../') {
    const requiredRole = roleForPath(window.location.pathname);
    const currentUser = fb && fb.isConfigured && fb.isConfigured()
      ? await fb.getCurrentUser()
      : (store ? store.getCurrentUser() : null);

    if (!currentUser) {
      redirectToLogin(depth);
      return;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
      redirectByRole(currentUser.role);
    }
  }

  window.JustifiAuthGuard = { protectPage };
})();