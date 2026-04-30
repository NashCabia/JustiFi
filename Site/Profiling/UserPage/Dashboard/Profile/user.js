function goToDashboard() {
  window.location.href = "../dash.html";
}

function goToBadges() {
  window.location.href = "../Badges/badge.html";
}

function showFloatingPanel(message, type = "success") {
  const panel = document.getElementById("floatingPanel");
  const text = document.getElementById("floatingPanelMessage");

  if (!panel || !text) {
    showFloatingPanel(message);
    return;
  }

  text.textContent = message;
  panel.className = `floating-panel ${type}`;

  setTimeout(() => {
    panel.classList.add("hidden");
  }, 3000);
}

async function logoutUser() {
  try {
    if (window.JustifiFirebase && window.JustifiFirebase.isConfigured()) {
      await window.JustifiFirebase.logout();
    }
    try { sessionStorage.setItem("justifi_force_logout", "1"); } catch (_) {}
    window.location.href = "../../../../Login/auth.html?logout=1";
  } catch (error) {
    console.error("Logout failed:", error);
    showFloatingPanel("Logout failed. Please try again.", "error");
  }
}

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();

  const saveBtn = document.getElementById("saveProfileBtn");
  const imageInput = document.getElementById("profileImageInput");

  if (saveBtn) {
    saveBtn.addEventListener("click", saveProfile);
  }

  if (imageInput) {
    imageInput.addEventListener("change", handleProfileImageChange);
  }

  await loadProfile();
});

async function loadProfile() {
  try {
    const fb = window.JustifiFirebase;

    if (!fb || !fb.isConfigured || !fb.isConfigured()) {
      console.warn("Firebase not configured");
      return;
    }

    // First attempt: this also initializes Firebase through firebase-service
    let user = await fb.getCurrentUser();
    console.log("Initial user load:", user);

    // If auth is not restored yet, wait once for Firebase Auth state
    if (!user) {
      user = await waitForAuthenticatedUser();
      console.log("User after auth restore:", user);
    }

    if (!user) {
      console.warn("No logged-in user");
      return;
    }

    currentUser = user;
    renderProfile(user);
  } catch (error) {
    console.error("Load profile error:", error);
  }
}

function waitForAuthenticatedUser() {
  return new Promise((resolve) => {
    // By this point, fb.getCurrentUser() already triggered Firebase init
    const unsubscribe = firebase.auth().onAuthStateChanged(async (firebaseUser) => {
      unsubscribe();

      if (!firebaseUser) {
        resolve(null);
        return;
      }

      try {
        const user = await window.JustifiFirebase.getCurrentUser();
        resolve(user);
      } catch (error) {
        console.error("Failed to map authenticated user:", error);
        resolve(null);
      }
    });
  });
}

function renderProfile(user) {
  console.log("Rendering profile:", user);

  const displayName =
    safeText(user.fullName) ||
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    safeText(user.email) ||
    "Student";

  setText("navUserName", safeText(user.firstName) || "Student");
  setText("profileDisplayName", displayName);
  setText("userRole", capitalize(user.role || "student"));
  setText(
    "userStatus",
    user.profileCompleted ? "Profile Completed" : "Complete your profile"
  );

  setValue("firstName", user.firstName);
  setValue("middleName", user.middleName);
  setValue("lastName", user.lastName);
  setValue("studentNumber", user.studentNumber);
  setDateValue("birthdate", user.birthdate);
  setValue("age", user.age);
  setSelectValue("sex", user.sex);
  setValue("gradeLevel", user.gradeLevel);
  setValue("section", user.section);
  setValue("school", user.school);

  setText("email", safeText(user.email) || "Not available");
  setText("roleField", capitalize(user.role || "student"));
  setText("accountStatus", capitalize(user.accountStatus || "active"));
  setText("createdAt", formatValue(user.createdAt));
  setText("updatedAt", formatValue(user.updatedAt));

  const profileImage = document.getElementById("profileImage");
  if (profileImage && user.avatarDataUrl) {
    profileImage.src = user.avatarDataUrl;
  }
}

async function saveProfile() {
  const saveBtn = document.getElementById("saveProfileBtn");
  const fb = window.JustifiFirebase;

  if (!fb || !fb.isConfigured || !fb.isConfigured()) {
    showFloatingPanel("Firebase is not configured yet.", "error");
    return;
  }

  if (!currentUser) {
    showFloatingPanel("No logged-in user found.", "error");
    return;
  }

  const firstName = getValue("firstName");
  const middleName = getValue("middleName");
  const lastName = getValue("lastName");
  const studentNumber = getValue("studentNumber");
  const birthdate = getValue("birthdate");
  const age = getValue("age");
  const sex = getValue("sex");
  const gradeLevel = getValue("gradeLevel");
  const section = getValue("section");
  const school = getValue("school");

  if (!firstName || !lastName) {
    showFloatingPanel("First name and last name are required.", "error");
    return;
  }

  const fullName = [firstName, middleName, lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const isComplete =
    firstName &&
    lastName &&
    studentNumber &&
    birthdate &&
    sex &&
    gradeLevel &&
    section &&
    school;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    currentUser = await fb.updateCurrentUserProfile({
      firstName,
      middleName,
      lastName,
      fullName,
      studentNumber,
      birthdate,
      age,
      sex,
      gradeLevel,
      section,
      school,
      profileCompleted: !!isComplete
    });

    renderProfile(currentUser);
    showFloatingPanel("Profile updated successfully.");
  } catch (error) {
    console.error("Failed to save profile:", error);
    showFloatingPanel("Failed to save profile.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}


async function handleProfileImageChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showFloatingPanel("Please select an image file only.", "error");
    event.target.value = "";
    return;
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    currentUser = await window.JustifiFirebase.updateCurrentUserProfile({
      profileImage: {
        localPath: dataUrl,
        cloudUrl: ""
      }
    });
    renderProfile(currentUser);
  } catch (error) {
    console.error("Failed to update profile image:", error);
    showFloatingPanel("Failed to update profile image.", "error");
  } finally {
    event.target.value = "";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? "";
}

function setDateValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  if (!value) {
    el.value = "";
    return;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    el.value = value;
    return;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    el.value = `${yyyy}-${mm}-${dd}`;
    return;
  }

  el.value = "";
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? "";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatValue(value) {
  if (!value) return "Not available";

  if (typeof value === "string") return value;

  if (value.seconds) {
    const date = new Date(value.seconds * 1000);
    return date.toLocaleString();
  }

  return "Not available";
}

function capitalize(value) {
  if (!value) return "Not available";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function setupMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const closeMenuBtn = document.getElementById("closeMenuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");

  function openMenu() {
    sideMenu.classList.add("open");
    overlay.classList.remove("hidden");
  }

  function closeMenu() {
    sideMenu.classList.remove("open");
    overlay.classList.add("hidden");
  }

  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", closeMenu);
}

function setupNotifications() {
  const toggle = document.getElementById("notifToggle");
  const panel = document.getElementById("notifPanel");
  const close = document.getElementById("notifClose");

  if (!toggle || !panel || !close) return;

  toggle.addEventListener("click", () => {
    panel.classList.toggle("hidden");
  });

  close.addEventListener("click", () => {
    panel.classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", setupNotifications);