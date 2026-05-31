import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged as fbOnAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db } from './firebaseClient.js';

function normalizeProfileImage(profile) {
  const image = profile && profile.profileImage ? profile.profileImage : {};
  const localPath = image.localPath || '';
  const cloudUrl = image.cloudUrl || '';

  return {
    localPath,
    cloudUrl,
    avatarDataUrl: cloudUrl || localPath || ''
  };
}

async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

async function mapUser(firebaseUser) {
  if (!firebaseUser) return null;

  const profile = (await getProfile(firebaseUser.uid)) || {};
  const image = normalizeProfileImage(profile);

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: firebaseUser.email || profile.email || '',
    role: profile.role || 'student',

    firstName: profile.firstName || '',
    middleName: profile.middleName || '',
    lastName: profile.lastName || '',
    fullName: profile.fullName || '',

    birthdate: profile.birthdate || '',
    studentNumber: profile.studentNumber || '',
    age: profile.age || '',
    sex: profile.sex || '',
    gradeLevel: profile.gradeLevel || '',
    section: profile.section || '',
    school: profile.school || '',

    adminId: profile.adminId || '',
    department: profile.department || '',
    position: profile.position || '',

    assignedGradeLevel: profile.assignedGradeLevel || '',
    assignedSection: profile.assignedSection || '',

    accountStatus: profile.accountStatus || 'active',
    profileCompleted: !!profile.profileCompleted,

    badges: Array.isArray(profile.badges) ? profile.badges : [],
    quizScores: Array.isArray(profile.quizScores) ? profile.quizScores : [],
    progress: Array.isArray(profile.progress) ? profile.progress : [],

    profileImage: {
      localPath: image.localPath,
      cloudUrl: image.cloudUrl
    },
    avatarDataUrl: image.avatarDataUrl,

    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,

    emailVerified: !!firebaseUser.emailVerified
  };
}

function mapProfileDoc(id, profile = {}) {
  const image = normalizeProfileImage(profile);

  return {
    id,
    uid: id,
    email: profile.email || '',
    role: profile.role || 'student',

    firstName: profile.firstName || '',
    middleName: profile.middleName || '',
    lastName: profile.lastName || '',
    fullName: profile.fullName || '',

    birthdate: profile.birthdate || '',
    studentNumber: profile.studentNumber || '',
    age: profile.age || '',
    sex: profile.sex || '',
    gradeLevel: profile.gradeLevel || '',
    section: profile.section || '',
    school: profile.school || '',

    adminId: profile.adminId || '',
    department: profile.department || '',
    position: profile.position || '',

    assignedGradeLevel: profile.assignedGradeLevel || '',
    assignedSection: profile.assignedSection || '',

    accountStatus: profile.accountStatus || 'active',
    profileCompleted: !!profile.profileCompleted,

    badges: Array.isArray(profile.badges) ? profile.badges : [],
    quizScores: Array.isArray(profile.quizScores) ? profile.quizScores : [],
    progress: Array.isArray(profile.progress) ? profile.progress : [],

    profileImage: {
      localPath: image.localPath,
      cloudUrl: image.cloudUrl
    },
    avatarDataUrl: image.avatarDataUrl,

    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,

    emailVerified: false
  };
}

export function getDisplayName(user) {
  if (!user) return 'Login';
  if (user.role === 'developer') return 'Developer';
  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user.fullName || user.email || 'User';
}

export function getDashboardPath(user) {
  if (!user) return '/login';

  if (user.role === 'teacher') return '/dashboard/teacher';
  if (user.role === 'developer') return '/dashboard/developer';
  return '/dashboard/student';
}

export function onAuthStateChanged(callback) {
  return fbOnAuthStateChanged(auth, async (firebaseUser) => {
    const user = firebaseUser ? await mapUser(firebaseUser) : null;
    callback(user);
  });
}

async function createUserProfileIfMissing(firebaseUser, pendingProfile = {}) {
  const ref = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    email: firebaseUser.email || pendingProfile.email || '',
    firstName: pendingProfile.firstName || '',
    middleName: pendingProfile.middleName || '',
    lastName: pendingProfile.lastName || '',
    fullName: `${pendingProfile.firstName || ''} ${pendingProfile.lastName || ''}`.trim(),
    role: 'student',
    accountStatus: 'active',
    profileCompleted: false,
    badges: [],
    quizScores: [],
    progress: [],
    profileImage: {
      localPath: '',
      cloudUrl: ''
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function registerUser(payload) {
  const normalizedEmail = (payload.email || '').toLowerCase().trim();

  // Check if email already exists in Firestore
  const emailQuery = await getDocs(
    query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
  );
  if (!emailQuery.empty) {
    throw new Error('Email already registered in the system. Please log in instead or contact an administrator.');
  }

  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, payload.password);
  await sendEmailVerification(cred.user);

  await createUserProfileIfMissing(cred.user, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: normalizedEmail
  });

  // Sign out until verified, matching legacy behavior
  await signOut(auth);

  return {
    pendingVerification: true,
    email: normalizedEmail
  };
}

export async function login(email, password, { remember } = { remember: false }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

  const cred = await signInWithEmailAndPassword(auth, email, password);

  if (!cred.user.emailVerified) {
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // ignore
    }

    await signOut(auth);
    throw new Error("Email not verified yet. We've sent you a verification link. Please check your email and verify, then log in again.");
  }

  // Ensure profile doc exists
  await createUserProfileIfMissing(cred.user, { email: cred.user.email || '' });

  return await mapUser(cred.user);
}

export async function logout() {
  await signOut(auth);
}

export async function getCurrentUser() {
  const u = auth.currentUser;
  return u ? await mapUser(u) : null;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export function isConfigured() {
  return !!auth && !!db;
}

export function getFirestore() {
  return db;
}

export async function updateCurrentUserProfile(patch = {}) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not logged in');

  const ref = doc(db, 'users', firebaseUser.uid);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return await mapUser(firebaseUser);
}

export async function updateUserProfileById(userId, patch = {}) {
  if (!userId) throw new Error('Missing user id');
  const ref = doc(db, 'users', userId);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  const snap = await getDoc(ref);
  return snap.exists() ? mapProfileDoc(snap.id, snap.data()) : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => mapProfileDoc(d.id, d.data()));
}

export function subscribeToUsers(onNext, onError) {
  const unsubscribe = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const users = snap.docs.map((d) => mapProfileDoc(d.id, d.data()));
      onNext?.(users);
    },
    (err) => {
      onError?.(err);
    }
  );

  return unsubscribe;
}

export async function getStudents(viewer = null) {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
  let students = snap.docs.map((d) => mapProfileDoc(d.id, d.data()));

  const viewerRole = (viewer?.role || '').toLowerCase();
  if (viewerRole === 'teacher') {
    const assignedGradeLevel = (viewer?.assignedGradeLevel || '').trim();
    const assignedSection = (viewer?.assignedSection || '').trim();

    if (assignedGradeLevel) {
      students = students.filter((s) => String(s.gradeLevel || '').trim() === assignedGradeLevel);
    }
    if (assignedSection) {
      students = students.filter((s) => String(s.section || '').trim() === assignedSection);
    }
  }

  return students;
}

export async function updateUserRoleByEmail(email, newRole, assignedGradeLevel = '', assignedSection = '') {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail) throw new Error('Email is required');

  const role = String(newRole || 'student').toLowerCase().trim();

  const q = await getDocs(
    query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
  );

  if (q.empty) {
    throw new Error('User not found');
  }

  const docSnap = q.docs[0];
  const ref = doc(db, 'users', docSnap.id);

  const patch = {
    role,
    updatedAt: serverTimestamp()
  };

  if (role === 'teacher') {
    patch.assignedGradeLevel = String(assignedGradeLevel || '').trim();
    patch.assignedSection = String(assignedSection || '').trim();
  } else {
    patch.assignedGradeLevel = '';
    patch.assignedSection = '';
  }

  await updateDoc(ref, patch);
  const updated = await getDoc(ref);
  return updated.exists() ? mapProfileDoc(updated.id, updated.data()) : null;
}
