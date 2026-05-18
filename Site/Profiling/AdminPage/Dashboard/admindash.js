function goToProfile() {
  window.location.href = "Profile/admin.html";
}

function goToStudents() {
  window.location.href = "Students/students.html";
}

function goToManageStudents() {
  window.location.href = "Manage/manage-students.html";
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
    showFloatingPanel("Logout failed. Please try again.");
  }
}

let overviewChart = null;
let latestStudents = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();
  await loadAdminDashboard();
});

async function loadAdminDashboard() {
  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  try {
    const currentUser = fb && fb.isConfigured && fb.isConfigured()
      ? (await fb.getCurrentUser()) || (await waitForAuthenticatedUser())
      : (store ? store.getCurrentUser() : null);

    bindAdminName(currentUser);
    await loadStudentOverview();
  } catch (error) {
    console.error("Failed to load admin dashboard:", error);
  }
}

function waitForAuthenticatedUser() {
  return new Promise((resolve) => {
    if (!window.firebase || !firebase.auth) {
      resolve(null);
      return;
    }

    const unsubscribe = firebase.auth().onAuthStateChanged(async (firebaseUser) => {
      unsubscribe();
      if (!firebaseUser) {
        resolve(null);
        return;
      }
      try {
        resolve(await window.JustifiFirebase.getCurrentUser());
      } catch (_) {
        resolve(null);
      }
    });
  });
}

function bindAdminName(user) {
  const fallbackName = "Admin";
  const name = user
    ? (window.JustifiFirebase && window.JustifiFirebase.getDisplayName
        ? window.JustifiFirebase.getDisplayName(user)
        : user.firstName || user.fullName || user.email || fallbackName)
    : fallbackName;

   

  if (navAdminName) navAdminName.textContent = name;
  if (heroAdminName) heroAdminName.textContent = name;
}

async function loadStudentOverview() {
  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  let students = [];

  try {
    if (fb && fb.isConfigured && fb.isConfigured()) {
      students = await fb.getStudents();
    } else if (store && typeof store.getStudents === "function") {
      students = store.getStudents();
    }
  } catch (error) {
    console.error("Failed to load student overview:", error);
    students = [];
  }

  latestStudents = students;

  const totalStudents = students.length;
  const activeStudents = students.filter(s => String(s.accountStatus || "active").toLowerCase() === "active").length;
  const completedProfiles = students.filter(s => !!s.profileCompleted).length;
  const studentsWithProgress = students.filter(s => hasAnyProgress(s.progress)).length;
  const averageQuizScore = Math.round(computeAverageQuizScorePercent(students));
  const overallCompletion = totalStudents ? Math.round((completedProfiles / totalStudents) * 100) : 0;

  setText("totalStudents", String(totalStudents));
  setText("activeStudents", String(activeStudents));
  setText("overallCompletion", `${overallCompletion}%`);

  renderAdminChart({
    totalStudents,
    activeStudents,
    completedProfiles,
    studentsWithProgress,
    averageQuizScore
  });
}

async function printStudentData() {
  try {
    let students = latestStudents;

    if (!Array.isArray(students) || !students.length) {
      const fb = window.JustifiFirebase;
      if (fb && fb.isConfigured && fb.isConfigured()) {
        students = await fb.getStudents();
      }
    }

    if (!Array.isArray(students) || !students.length) {
      showFloatingPanel("No student data available to export.", "error");
      return;
    }

    if (typeof XLSX === "undefined") {
      showFloatingPanel("Excel export library is not loaded.", "error");
      return;
    }

    const summaryRows = [
      { Metric: "Total Students", Value: students.length },
      { Metric: "Active Students", Value: students.filter(s => String(s.accountStatus || "active").toLowerCase() === "active").length },
      { Metric: "Completed Profiles", Value: students.filter(s => !!s.profileCompleted).length },
      { Metric: "Students with Progress", Value: students.filter(s => hasAnyProgress(s.progress)).length },
      { Metric: "Average Quiz Score", Value: `${Math.round(computeAverageQuizScorePercent(students))}%` }
    ];

    const studentRows = students.map((student) => {
      const progressItems = Array.isArray(student.progress) ? student.progress : [];
      const quizScores = Array.isArray(student.quizScores) ? student.quizScores : [];
      const quizAverage = quizScores.length
        ? Math.round(quizScores.reduce((sum, score) => sum + Number(score && score.score !== undefined ? score.score : score || 0), 0) / quizScores.length)
        : 0;

      return {
        Name: student.fullName || [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || student.email || "",
        Email: student.email || "",
        Role: student.role || "student",
        GradeLevel: student.gradeLevel || "",
        Section: student.section || "",
        Status: student.accountStatus || "active",
        ProfileCompleted: student.profileCompleted ? "Yes" : "No",
        CompletedLessons: progressItems.length,
        BadgeCount: Array.isArray(student.badges) ? student.badges.length : 0,
        QuizAverage: `${quizAverage}%`
      };
    });

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    const studentsSheet = XLSX.utils.json_to_sheet(studentRows);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, studentsSheet, "Students");

    const fileName = `student-monitoring-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showFloatingPanel("Student data exported to Excel.", "success");
  } catch (error) {
    console.error("Failed to export student data:", error);
    showFloatingPanel("Failed to export student data.", "error");
  }
}

function hasAnyProgress(progress) {
  if (!Array.isArray(progress)) return false;
  return progress.some(v => Number(v) > 0);
}

function computeAverageQuizScorePercent(students) {
  let total = 0;
  let count = 0;

  for (const student of students || []) {
    const scores = Array.isArray(student.quizScores) ? student.quizScores : [];
    for (const s of scores) {
      const raw = s && s.score !== undefined ? Number(s.score) : NaN;
      if (Number.isNaN(raw)) continue;
      const percent = raw <= 10 ? raw * 10 : raw;
      total += percent;
      count += 1;
    }
  }

  return count ? total / count : 0;
}

function renderAdminChart(summary) {
  const canvas = document.getElementById("adminOverviewChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (overviewChart) {
    try { overviewChart.destroy(); } catch (_) {}
  }

  overviewChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: [
        "Total Students",
        "Active Students",
        "Completed Profiles",
        "Students with Progress",
        "Average Quiz Score"
      ],
      datasets: [{
        label: "Admin Overview",
        data: [
          summary.totalStudents ?? 0,
          summary.activeStudents ?? 0,
          summary.completedProfiles ?? 0,
          summary.studentsWithProgress ?? 0,
          summary.averageQuizScore ?? 0
        ],
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#1c1132"
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || "";
              const value = context.raw ?? 0;
              return label === "Average Quiz Score" ? `${label}: ${value}%` : `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#4e4466" },
          grid: { color: "rgba(28,17,50,0.08)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#4e4466" },
          grid: { color: "rgba(28,17,50,0.08)" }
        }
      }
    }
  });
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

window.printStudentData = printStudentData;

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