
(function () {
  const USERS_KEY = 'justifi_users';
  const CURRENT_KEY = 'justifi_current_user';
  const BADGE_DEFS = [
    { id: 'starter', label: 'Starter', description: 'Created a JustiFi account' },
    { id: 'quiz_rookie', label: 'Quiz Rookie', description: 'Recorded the first quiz score' },
    { id: 'consistent', label: 'Consistent', description: 'Reached 70% average progress' }
  ];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function formatName(user) {
    if (!user) return 'Login';
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    const full = `${first} ${last}`.trim();
    return full || user.email || 'User';
  }

  function seed() {
    const existing = readJson(USERS_KEY, null);
    if (existing && existing.length) return;
    const users = [
      {
        id: 'demo_student_1',
        email: 'student1@justifi.demo',
        password: '123456',
        role: 'student',
        birthdate: '2006-05-14',
        studentNumber: '2026-0001',
        lastName: 'Santos',
        firstName: 'Mika',
        middleName: 'Reyes',
        badges: ['starter', 'quiz_rookie'],
        quizScores: [
          { quizNumber: 1, score: 8, dateAcquired: '2026-03-01' },
          { quizNumber: 2, score: 9, dateAcquired: '2026-03-08' },
          { quizNumber: 3, score: 7, dateAcquired: '2026-03-15' }
        ],
        progress: [55, 68, 72, 80],
        avatarDataUrl: '../../Images/nash.jpg'
      },
      {
        id: 'demo_student_2',
        email: 'student2@justifi.demo',
        password: '123456',
        role: 'student',
        birthdate: '2006-09-02',
        studentNumber: '2026-0002',
        lastName: 'Garcia',
        firstName: 'Lian',
        middleName: 'Torres',
        badges: ['starter'],
        quizScores: [
          { quizNumber: 1, score: 6, dateAcquired: '2026-03-01' },
          { quizNumber: 2, score: 7, dateAcquired: '2026-03-08' },
          { quizNumber: 3, score: 8, dateAcquired: '2026-03-15' }
        ],
        progress: [40, 52, 60, 70],
        avatarDataUrl: '../../Images/nash.jpg'
      },
      {
        id: 'demo_teacher_1',
        email: 'teacher@justifi.demo',
        password: '123456',
        role: 'teacher',
        birthdate: '1995-12-12',
        studentNumber: 'T-0001',
        lastName: 'Dela Cruz',
        firstName: 'Ariana',
        middleName: 'Lopez',
        badges: ['starter'],
        quizScores: [],
        progress: [],
        avatarDataUrl: '../Images/nash.jpg'
      }
    ];
    writeJson(USERS_KEY, users);
  }

  seed();

  const store = {
    badgeDefs: BADGE_DEFS,
    getUsers() {
      return readJson(USERS_KEY, []);
    },
    saveUsers(users) {
      writeJson(USERS_KEY, users);
    },
    getCurrentUser() {
      return readJson(CURRENT_KEY, null);
    },
    setCurrentUser(user) {
      writeJson(CURRENT_KEY, user);
    },
    clearCurrentUser() {
      localStorage.removeItem(CURRENT_KEY);
    },
    findUserByEmail(email) {
      return this.getUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase());
    },
    findUserById(id) {
      return this.getUsers().find(u => u.id === id);
    },
    registerUser(payload) {
      const users = this.getUsers();
      if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error('Email is already registered.');
      }
      const user = {
        id: uid(),
        email: payload.email,
        password: payload.password,
        role: payload.role || 'student',
        birthdate: payload.birthdate || '',
        studentNumber: payload.studentNumber || '',
        lastName: payload.lastName || '',
        firstName: payload.firstName || '',
        middleName: payload.middleName || '',
        badges: ['starter'],
        quizScores: payload.quizScores || [],
        progress: payload.progress || [0, 0, 0, 0],
        avatarDataUrl: payload.avatarDataUrl || ''
      };
      users.push(user);
      this.saveUsers(users);
      this.setCurrentUser(user);
      return user;
    },
    login(email, password) {
      const user = this.getUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
      if (!user) throw new Error('Invalid email or password.');
      this.setCurrentUser(user);
      return user;
    },
    updateCurrentUser(patch) {
      const current = this.getCurrentUser();
      if (!current) return null;
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === current.id);
      if (idx === -1) return null;
      const next = { ...users[idx], ...patch };
      users[idx] = next;
      this.saveUsers(users);
      this.setCurrentUser(next);
      return next;
    },
    getStudents() {
      return this.getUsers().filter(u => u.role === 'student');
    },
    getDisplayName(user) {
      return formatName(user);
    },
   getDashboardPath(user, depth = '') {
  if (!user) return `${depth}Login/auth.html`;
  if (user.role === 'teacher') {
    return `${depth}Profiling/AdminPage/Dashboard/admindash.html`;
  }
  if (user.role === 'developer') {
    return `${depth}Profiling/Developer/Dashboard/developer.html`;
  }
  return `${depth}Profiling/UserPage/Dashboard/dash.html`;
}
  };

  window.JustifiStore = store;
})();
