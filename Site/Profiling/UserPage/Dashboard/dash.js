function goToProfile() {
  window.location.href = "Profile/user.html";
}

function goToBadges() {
  window.location.href = "Badges/badge.html";
}

async function logoutUser() {
  try {
    if (window.JustifiFirebase && window.JustifiFirebase.isConfigured()) {
      await window.JustifiFirebase.logout();
    }
    try { sessionStorage.setItem("justifi_force_logout", "1"); } catch (_) {}
    window.location.href = "../../../Login/auth.html?logout=1";
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Logout failed. Please try again.");
  }
}

let currentUser = null;
let dashboardChart = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();
  await loadDashboard();
});

async function loadDashboard() {
  try {
    const fb = window.JustifiFirebase;

    if (!fb || !fb.isConfigured || !fb.isConfigured()) {
      console.warn("Firebase not configured.");
      return;
    }

    let user = await fb.getCurrentUser();
    console.log("Initial dashboard user:", user);

    if (!user) {
      user = await waitForAuthenticatedUser();
      console.log("Dashboard user after auth restore:", user);
    }

    if (!user) {
      console.warn("No logged-in user found.");
      return;
    }

    currentUser = user;
    renderDashboard(user);
  } catch (error) {
    console.error("Failed to load dashboard:", error);
  }
}

function waitForAuthenticatedUser() {
  return new Promise((resolve) => {
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
        console.error("Failed to map authenticated dashboard user:", error);
        resolve(null);
      }
    });
  });
}

function renderDashboard(user) {
  const displayName =
    safeText(user.firstName) ||
    safeText(user.fullName) ||
    safeText(user.email) ||
    "Student";

  setText("navUserName", displayName);
  setText("heroUserName", displayName);

  const progressItems = Array.isArray(user.progress) ? user.progress : [];
  const badges = Array.isArray(user.badges) ? user.badges : [];
  const quizScores = Array.isArray(user.quizScores) ? user.quizScores : [];

  const completedLessons = progressItems.length;
  const average = quizScores.length
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
    : 0;

  setText("lessonCount", String(completedLessons).padStart(2, "0"));
  setText("badgeCount", String(badges.length).padStart(2, "0"));
  setText("quizAverage", `${average}%`);

  renderDashboardChart(progressItems);
}

function renderDashboardChart(progressItems) {
  const canvas = document.getElementById("dashboardProgressChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = progressItems.length
    ? progressItems.map((item, index) => item.moduleTitle || `Module ${index + 1}`)
    : ["No Data"];

  const scores = progressItems.length
    ? progressItems.map(item => Number(item.score) || 0)
    : [0];

  if (dashboardChart) {
    dashboardChart.destroy();
  }

  dashboardChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Progress Score",
          data: scores,
          borderWidth: 2,
          tension: 0.35,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#ffffff"
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#d6cae2" },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: "#d6cae2" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      }
    }
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
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
document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();

  if (window.SessionManager) {
    SessionManager.start();
  }

  await loadDashboard(); // or loadProfile()
});