(function () {
  const PLACEHOLDERS = [
    "PASTE_YOUR_API_KEY",
    "PASTE_YOUR_AUTH_DOMAIN",
    "PASTE_YOUR_PROJECT_ID",
    "PASTE_YOUR_STORAGE_BUCKET",
    "PASTE_YOUR_MESSAGING_SENDER_ID",
    "PASTE_YOUR_APP_ID"
  ];

  function getConfig() {
    return window.JUSTIFI_FIREBASE_CONFIG || null;
  }

  function isConfigured() {
    const cfg = getConfig();
    if (!cfg) return false;
    const values = Object.values(cfg);
    return values.length && values.every(
      v => typeof v === "string" && v && !PLACEHOLDERS.includes(v)
    );
  }

  let app = null;
  let auth = null;
  let db = null;

  function ensureInit() {
    if (!isConfigured()) return false;
    if (!window.firebase) return false;

    if (!app) {
      if (!firebase.apps.length) {
        app = firebase.initializeApp(getConfig());
      } else {
        app = firebase.app();
      }

      auth = firebase.auth();
      db = firebase.firestore();
    }

    return true;
  }

  async function getProfile(uid) {
    ensureInit();
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  function normalizeProfileImage(profile) {
    const image = profile && profile.profileImage ? profile.profileImage : {};
    const localPath = image.localPath || "";
    const cloudUrl = image.cloudUrl || "";

    return {
      localPath,
      cloudUrl,
      avatarDataUrl: cloudUrl || localPath || ""
    };
  }

  async function mapUser(firebaseUser) {
    if (!firebaseUser) return null;

    const profile = (await getProfile(firebaseUser.uid)) || {};
    const image = normalizeProfileImage(profile);

    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email || profile.email || "",
      role: profile.role || "student",

      firstName: profile.firstName || "",
      middleName: profile.middleName || "",
      lastName: profile.lastName || "",
      fullName: profile.fullName || "",

      birthdate: profile.birthdate || "",
      studentNumber: profile.studentNumber || "",
      age: profile.age || "",
      sex: profile.sex || "",
      gradeLevel: profile.gradeLevel || "",
      section: profile.section || "",
      school: profile.school || "",

      adminId: profile.adminId || "",
      department: profile.department || "",
      position: profile.position || "",

      assignedGradeLevel: profile.assignedGradeLevel || "",
      assignedSection: profile.assignedSection || "",

      accountStatus: profile.accountStatus || "active",
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
      updatedAt: profile.updatedAt || null
    };
  }

  function mapFirestoreDoc(doc) {
    const data = doc.data() || {};
    const image = normalizeProfileImage(data);

    return {
      id: doc.id,
      uid: doc.id,
      email: data.email || "",
      role: data.role || "student",

      firstName: data.firstName || "",
      middleName: data.middleName || "",
      lastName: data.lastName || "",
      fullName: data.fullName || "",

      birthdate: data.birthdate || "",
      studentNumber: data.studentNumber || "",
      age: data.age || "",
      sex: data.sex || "",
      gradeLevel: data.gradeLevel || "",
      section: data.section || "",
      school: data.school || "",

      adminId: data.adminId || "",
      department: data.department || "",
      position: data.position || "",

      assignedGradeLevel: data.assignedGradeLevel || "",
      assignedSection: data.assignedSection || "",

      accountStatus: data.accountStatus || "active",
      profileCompleted: !!data.profileCompleted,

      badges: Array.isArray(data.badges) ? data.badges : [],
      quizScores: Array.isArray(data.quizScores) ? data.quizScores : [],
      progress: Array.isArray(data.progress) ? data.progress : [],

      profileImage: {
        localPath: image.localPath,
        cloudUrl: image.cloudUrl
      },
      avatarDataUrl: image.avatarDataUrl,

      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
  }

  async function createUserProfileIfMissing(firebaseUser) {
    const docRef = db.collection("users").doc(firebaseUser.uid);
    const snap = await docRef.get();

    if (snap.exists) return;

    let pendingProfile = {};

    try {
      pendingProfile = JSON.parse(localStorage.getItem("pendingRegistrationProfile")) || {};
    } catch (_) {
      pendingProfile = {};
    }

    await docRef.set({
      email: firebaseUser.email || pendingProfile.email || "",
      firstName: pendingProfile.firstName || "",
      middleName: pendingProfile.middleName || "",
      lastName: pendingProfile.lastName || "",
      fullName: `${pendingProfile.firstName || ""} ${pendingProfile.lastName || ""}`.trim(),
      role: "student",
      accountStatus: "active",
      profileCompleted: false,
      badges: [],
      quizScores: [],
      progress: [],
      profileImage: {
        localPath: "",
        cloudUrl: ""
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.removeItem("pendingRegistrationProfile");
  }

  const api = {
    isConfigured,

    onAuthStateChanged(callback) {
      if (!ensureInit()) {
        callback(null);
        return () => {};
      }

      return auth.onAuthStateChanged(async (firebaseUser) => {
        const user = firebaseUser ? await mapUser(firebaseUser) : null;
        callback(user);
      });
    },

    getDisplayName(user) {
      if (!user) return "Login";
      if (user.role === "developer") return "Developer";
      const first = (user.firstName || "").trim();
      const last = (user.lastName || "").trim();
      const full = `${first} ${last}`.trim();
      return full || user.fullName || user.email || "User";
    },

    getDashboardPath(user, depth = "") {
      if (!user) return `${depth}Login/auth.html`;

      if (user.role === "teacher") {
        return `${depth}Profiling/AdminPage/Dashboard/admindash.html`;
      }

      if (user.role === "developer") {
        return `${depth}Profiling/Developer/Dashboard/developer.html`;
      }

      return `${depth}Profiling/UserPage/Dashboard/dash.html`;
    },

    async registerUser(payload) {
      if (!ensureInit()) throw new Error("Firebase is not configured yet.");

      // Normalize email to lowercase for comparison
      const normalizedEmail = (payload.email || "").toLowerCase().trim();

      // Check if email already exists in Firestore
      const emailQuery = await db.collection("users").where("email", "==", normalizedEmail).limit(1).get();
      if (!emailQuery.empty) {
        throw new Error("Email already registered in the system. Please log in instead or contact an administrator.");
      }

      const cred = await auth.createUserWithEmailAndPassword(
        normalizedEmail,
        payload.password
      );

      await cred.user.sendEmailVerification();

      localStorage.setItem("pendingRegistrationProfile", JSON.stringify({
        firstName: payload.firstName || "",
        middleName: payload.middleName || "",
        lastName: payload.lastName || "",
        email: normalizedEmail || ""
      }));

      await auth.signOut();

      return {
        pendingVerification: true,
        email: normalizedEmail
      };
    },

    async login(email, password) {
      if (!ensureInit()) throw new Error("Firebase is not configured yet.");

      const cred = await auth.signInWithEmailAndPassword(email, password);

      if (!cred.user.emailVerified) {
        // Send verification email before signing out
        try {
          await cred.user.sendEmailVerification();
        } catch (error) {
          console.warn("Could not send verification email:", error);
        }
        
        await auth.signOut();
        throw new Error("Email not verified yet. We've sent you a verification link. Please check your email and verify, then log in again.");
      }

      await createUserProfileIfMissing(cred.user);

      return await mapUser(cred.user);
    },

    async logout() {
      if (!ensureInit()) return;
      await auth.signOut();
    },

    async getCurrentUser() {
      if (!ensureInit()) return null;
      return await mapUser(auth.currentUser);
    },

    getFirestore() {
      if (!ensureInit()) return null;
      return db;
    },

    getAuth() {
      if (!ensureInit()) return null;
      return auth;
    },

    async updateCurrentUserProfile(patch) {
      if (!ensureInit()) throw new Error("Firebase is not configured yet.");

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("No signed-in user.");

      const allowedKeys = [
        "firstName",
        "middleName",
        "lastName",
        "fullName",
        "studentNumber",
        "birthdate",
        "age",
        "sex",
        "gradeLevel",
        "section",
        "school",
        "adminId",
        "department",
        "position",
        "profileCompleted",
        "profileImage"
      ];

      const allowedPatch = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(patch || {}, key)) {
          allowedPatch[key] = patch[key];
        }
      }

      await db.collection("users").doc(firebaseUser.uid).set(allowedPatch, {
        merge: true
      });

      return await mapUser(firebaseUser);
    },

    async getAllUsers() {
      if (!ensureInit()) throw new Error("Firebase is not configured yet.");

      const snap = await db.collection("users").get();
      return snap.docs.map(mapFirestoreDoc);
    },

    subscribeToUsers(onUpdate, onError) {
      if (!ensureInit()) {
        if (typeof onError === "function") {
          onError(new Error("Firebase is not configured yet."));
        }
        return () => {};
      }

      return db.collection("users").onSnapshot(
        (snap) => {
          const users = snap.docs.map(mapFirestoreDoc);
          if (typeof onUpdate === "function") {
            onUpdate(users);
          }
        },
        (error) => {
          if (typeof onError === "function") {
            onError(error);
          } else {
            console.error("Failed to subscribe to users:", error);
          }
        }
      );
    },

    async getStudents(adminUser = null) {
      if (!ensureInit()) throw new Error("Firebase is not configured yet.");

      let query = db.collection("users").where("role", "==", "student");

      if (adminUser && adminUser.role === "teacher") {
        if (adminUser.assignedGradeLevel) {
          query = query.where("gradeLevel", "==", adminUser.assignedGradeLevel);
        }

        if (adminUser.assignedSection) {
          query = query.where("section", "==", adminUser.assignedSection);
        }
      }

      const snap = await query.get();
      return snap.docs.map(mapFirestoreDoc);
    },

    async updateUserRoleByEmail(email, role, assignedGradeLevel = "", assignedSection = "") {
      if (!ensureInit()) throw new Error("Firebase is not configured yet.");

      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail) throw new Error("Email is required.");

      const cleanRole = String(role || "").trim().toLowerCase();

      if (!["student", "teacher", "developer"].includes(cleanRole)) {
        throw new Error("Invalid role selected.");
      }

      const snap = await db
        .collection("users")
        .where("email", "==", cleanEmail)
        .limit(1)
        .get();

      if (snap.empty) throw new Error("User not found.");

      const patch = {
        role: cleanRole,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (cleanRole === "teacher") {
        patch.assignedGradeLevel = assignedGradeLevel;
        patch.assignedSection = assignedSection;
      } else {
        patch.assignedGradeLevel = "";
        patch.assignedSection = "";
      }

      await snap.docs[0].ref.update(patch);

      return {
        id: snap.docs[0].id,
        ...snap.docs[0].data(),
        ...patch
      };
    }
  };

  window.JustifiFirebase = api;
})();