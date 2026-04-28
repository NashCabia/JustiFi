const panel = document.querySelector(".auth-panel");
const store = window.JustifiStore;
const fb = window.JustifiFirebase;

const REMEMBER_KEY = "justifi_remember_me";
const REMEMBER_EMAIL_KEY = "justifi_remember_email";
const REMEMBER_PASSWORD_KEY = "justifi_remember_password";
const FORCE_LOGOUT_KEY = "justifi_force_logout";

document.getElementById("showRegister").onclick = () =>
  panel.classList.add("show-register");

document.getElementById("showLogin").onclick = () =>
  panel.classList.remove("show-register");

document.addEventListener("DOMContentLoaded", async () => {
  restoreRememberedLogin();

  if (shouldForceLogout()) {
    await forceLogout();
  }

  await redirectIfAlreadyLoggedIn();
});

function shouldForceLogout() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("logout") === "1") return true;

  try {
    return sessionStorage.getItem(FORCE_LOGOUT_KEY) === "1";
  } catch (_) {
    return false;
  }
}

async function forceLogout() {
  try {
    sessionStorage.removeItem(FORCE_LOGOUT_KEY);
  } catch (_) {}

  // Clear any local-demo session unconditionally.
  try {
    if (store && store.clearCurrentUser) {
      store.clearCurrentUser();
    }
  } catch (_) {}

  // Prefer using the app wrapper (it initializes Firebase internally).
  try {
    if (fb && fb.logout && fb.isConfigured && fb.isConfigured()) {
      await fb.logout();
    }
  } catch (error) {
    console.warn("Forced Firebase logout failed:", error);
  }

  // Remove logout param so refresh doesn't keep forcing logout.
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("logout")) {
      url.searchParams.delete("logout");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  } catch (_) {}
}

function dashboardPathFor(user) {
  if (fb && fb.getDashboardPath) return fb.getDashboardPath(user, "../");
  if (!user) return "../index.html";

  if (user.role === "teacher") {
    return "../Profiling/AdminPage/Dashboard/admindash.html";
  }
  if (user.role === "developer") {
    return "../Profiling/Developer/Dashboard/developer.html";
  }
  return "../Profiling/UserPage/Dashboard/dash.html";
}

async function waitForAuthenticatedUser() {
  return new Promise((resolve) => {
    if (!window.firebase || !firebase.auth) {
      resolve(null);
      return;
    }

    const unsubscribe = firebase.auth().onAuthStateChanged(async () => {
      unsubscribe();
      try {
        const user = await fb.getCurrentUser();
        resolve(user);
      } catch (error) {
        console.error("Failed to restore auth user:", error);
        resolve(null);
      }
    });
  });
}

async function redirectIfAlreadyLoggedIn() {
  try {
    if (!fb || !fb.isConfigured || !fb.isConfigured()) return;

    let user = await fb.getCurrentUser();
    if (!user) {
      user = await waitForAuthenticatedUser();
    }

    if (user) {
      window.location.href = dashboardPathFor(user);
    }
  } catch (error) {
    console.error("Auth redirect check failed:", error);
  }
}

function saveRememberedLogin(email, password, remember) {
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, "true");
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    localStorage.setItem(REMEMBER_PASSWORD_KEY, password);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
    localStorage.removeItem(REMEMBER_PASSWORD_KEY);
  }
}

function restoreRememberedLogin() {
  const remember = localStorage.getItem(REMEMBER_KEY) === "true";
  const email = localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
  const password = localStorage.getItem(REMEMBER_PASSWORD_KEY) || "";

  const rememberMe = document.getElementById("rememberMe");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");

  if (rememberMe) rememberMe.checked = remember;
  if (loginEmail && remember) loginEmail.value = email;
  if (loginPassword && remember) loginPassword.value = password;
}

async function registerWithSelectedProvider(payload) {
  if (fb && fb.isConfigured && fb.isConfigured()) {
    return fb.registerUser(payload);
  }
  return Promise.resolve(store.registerUser(payload));
}

async function loginWithSelectedProvider(email, password) {
  if (fb && fb.isConfigured && fb.isConfigured()) {
    return fb.login(email, password);
  }
  return Promise.resolve(store.login(email, password));
}

document.getElementById("registerBtn").addEventListener("click", async () => {
  const payload = {
    firstName: document.getElementById("regFirstName").value.trim(),
    lastName: document.getElementById("regLastName").value.trim(),
    middleName: document.getElementById("regMiddleName").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPassword").value
  };

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password) {
    alert("Please complete the required fields.");
    return;
  }

  if (payload.password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {
    const user = await registerWithSelectedProvider(payload);
    alert("Account created successfully.");
    window.location.href = dashboardPathFor(user);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const remember = document.getElementById("rememberMe").checked;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  try {
    const user = await loginWithSelectedProvider(email, password);

    saveRememberedLogin(email, password, remember);

    if (user.role === "student" && !user.profileCompleted) {
      window.location.href = "../Profiling/UserPage/Dashboard/Profile/user.html";
      return;
    }

    window.location.href = dashboardPathFor(user);
  } catch (error) {
    alert(error.message);
  }
});