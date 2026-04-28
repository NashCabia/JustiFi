function goToAssignRoles() {
  window.location.href = "HTML/assign-roles.html";
}

function goToManageAccounts() {
  window.location.href = "HTML/manage-accounts.html";
}

function goToSystemSettings() {
  window.location.href = "HTML/system-settings.html";
}

async function logoutUser() {
  try {
    if (window.JustifiFirebase && window.JustifiFirebase.isConfigured()) {
      await window.JustifiFirebase.logout();
    } else if (window.JustifiStore) {
      window.JustifiStore.clearCurrentUser();
    }

    try { sessionStorage.setItem("justifi_force_logout", "1"); } catch (_) {}
    window.location.href = "../../../Login/auth.html?logout=1";
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Logout failed. Please try again.");
  }
}

/*
  FIREBASE-READY PLACEHOLDER
  Later, replace these values with Firestore/user summary data.
*/
const developerDashboardData = {
  firstName: "Developer",
  totalUsers: 145,
  studentAccounts: 120,
  teacherAccounts: 20,
  developerAccounts: 5
};

document.addEventListener("DOMContentLoaded", () => {
  renderDeveloperDashboard();
  setupMenu();
  bindAuthName();
});

function renderDeveloperDashboard() {
  setText("heroDevName", developerDashboardData.firstName || "Developer");
  setText("totalUsers", developerDashboardData.totalUsers ?? 0);
  setText("studentAccounts", developerDashboardData.studentAccounts ?? 0);
  setText("teacherAccounts", developerDashboardData.teacherAccounts ?? 0);
  setText("developerAccounts", developerDashboardData.developerAccounts ?? 0);
}

function bindAuthName() {
  const navUserName = document.getElementById("navUserName");
  if (!navUserName) return;

  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  const apply = (user) => {
    if (!user) {
      navUserName.textContent = developerDashboardData.firstName || "Developer";
      return;
    }

    const name =
      (fb && fb.getDisplayName ? fb.getDisplayName(user) : null) ||
      user.firstName ||
      user.email ||
      developerDashboardData.firstName ||
      "Developer";

    navUserName.textContent = name;
    setText("heroDevName", name);
  };

  if (fb && fb.onAuthStateChanged) {
    fb.onAuthStateChanged(apply);
  } else {
    apply(store ? store.getCurrentUser() : null);
  }
}

function setupMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const closeMenuBtn = document.getElementById("closeMenuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuOverlay = document.getElementById("menuOverlay");

  function openMenu() {
    sideMenu.classList.add("open");
    menuOverlay.classList.remove("hidden");
  }

  function closeMenu() {
    sideMenu.classList.remove("open");
    menuOverlay.classList.add("hidden");
  }

  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);
  if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}