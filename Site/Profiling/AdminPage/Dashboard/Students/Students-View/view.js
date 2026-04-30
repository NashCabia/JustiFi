function goToDashboard() {
  window.location.href = "../../admindash.html";
}

function goToStudents() {
  window.location.href = "../students.html";
}

async function logoutUser() {
  try {
    if (window.JustifiFirebase && window.JustifiFirebase.isConfigured()) {
      await window.JustifiFirebase.logout();
    } else if (window.JustifiStore) {
      window.JustifiStore.clearCurrentUser();
    }

    try { sessionStorage.setItem("justifi_force_logout", "1"); } catch (_) {}
    window.location.href = "../../../../../Login/auth.html?logout=1";
  } catch (error) {
    console.error("Logout failed:", error);
    showFloatingPanel("Logout failed. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const savedName = localStorage.getItem("justifiUserName") || "Admin";
  const navUserName = document.getElementById("navUserName");
  if (navUserName) navUserName.textContent = savedName;

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

  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("id");

  const studentNameEl = document.getElementById("student-name");
  const completedLessonsEl = document.getElementById("completedLessons");
  const badgeCountEl = document.getElementById("badgeCount");
  const quizAverageEl = document.getElementById("quizAverage");
  const chartCanvas = document.getElementById("progressChart");

  let student = null;

  // placeholder data for now
  const demoStudents = [
    {
      id: "student-1",
      firstName: "Juan",
      lastName: "Dela Cruz",
      completedLessons: 8,
      badges: ["Rights Explorer", "Case Reader", "Quiz Finisher"],
      quizScores: [80, 85, 90, 92]
    },
    {
      id: "student-2",
      firstName: "Maria",
      lastName: "Santos",
      completedLessons: 6,
      badges: ["Quick Learner", "Badge Hunter"],
      quizScores: [75, 82, 88, 90]
    },
    {
      id: "student-3",
      firstName: "Pedro",
      lastName: "Reyes",
      completedLessons: 4,
      badges: ["Story Starter"],
      quizScores: [60, 70, 78, 84]
    }
  ];

  student = demoStudents.find((item) => item.id === studentId) || demoStudents[0];

  const fullName =
    [student.firstName, student.lastName].filter(Boolean).join(" ").trim() ||
    "Student";

  const completedLessons = student.completedLessons || 0;
  const badgeCount = Array.isArray(student.badges) ? student.badges.length : 0;
  const quizScores = Array.isArray(student.quizScores) ? student.quizScores : [];
  const quizAverage = quizScores.length
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
    : 0;

  if (studentNameEl) studentNameEl.textContent = fullName;
  if (completedLessonsEl) completedLessonsEl.textContent = completedLessons;
  if (badgeCountEl) badgeCountEl.textContent = badgeCount;
  if (quizAverageEl) quizAverageEl.textContent = `${quizAverage}%`;

  if (chartCanvas && typeof Chart !== "undefined") {
    new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: ["Quiz 1", "Quiz 2", "Quiz 3", "Quiz 4"],
        datasets: [
          {
            label: "Quiz Score",
            data: quizScores,
            borderWidth: 2,
            tension: 0.3
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
});

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