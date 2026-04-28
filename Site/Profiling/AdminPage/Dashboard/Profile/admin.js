function goToDashboard() {
  window.location.href = "../admindash.html";
}

function goToStudents() {
  window.location.href = "../Students/students.html";
}

async function logoutUser() {
  try {
    if (window.JustifiFirebase && window.JustifiFirebase.isConfigured()) {
      await window.JustifiFirebase.logout();
    } else if (window.JustifiStore) {
      window.JustifiStore.clearCurrentUser();
    }

    try { sessionStorage.setItem("justifi_force_logout", "1"); } catch (_) {}
    window.location.href = "../../../../Login/auth.html?logout=1";
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Logout failed. Please try again.");
  }
}

let currentUser = null;
let overviewChart = null;

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
  await loadStudentOverview();
});

async function loadProfile() {
  try {
    const fb = window.JustifiFirebase;

    if (!fb || !fb.isConfigured || !fb.isConfigured()) {
      console.warn("Firebase not configured");
      return;
    }

    let user = await fb.getCurrentUser();

    if (!user) {
      user = await waitForAuthenticatedUser();
    }

    if (!user) {
      console.warn("No logged-in user");
      return;
    }

    currentUser = user;
    renderAdminProfile(user);
  } catch (error) {
    console.error("Load admin profile error:", error);
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
        console.error("Failed to map authenticated user:", error);
        resolve(null);
      }
    });
  });
}

function renderAdminProfile(user) {
  const displayName =
    safeText(user.fullName) ||
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    safeText(user.email) ||
    "Admin";

  setText("navAdminName", displayName || "Admin");
  setText("profileDisplayName", displayName);
  setText("userRole", capitalize(user.role || "teacher"));
  setText(
    "userStatus",
    user.profileCompleted ? "Profile Completed" : "Complete your profile"
  );

  setValue("firstName", user.firstName);
  setValue("middleName", user.middleName);
  setValue("lastName", user.lastName);
  setValue("adminId", user.adminId);
  setValue("department", user.department);
  setValue("position", user.position);
  setValue("school", user.school);

  setText("email", safeText(user.email) || "Not available");
  setText("roleField", capitalize(user.role || "teacher"));
  setText("accountStatus", capitalize(user.accountStatus || "active"));
  setText("createdAt", formatValue(user.createdAt));
  setText("updatedAt", formatValue(user.updatedAt));

  const profileImage = document.getElementById("profileImage");

const DEFAULT_IMAGE = "Images/default-avatar.webp";

// ALWAYS start with placeholder
if (profileImage) {
  profileImage.src = DEFAULT_IMAGE;
}

// Then override if user has image
if (profileImage && user.profileImage?.localPath) {
  profileImage.src = user.profileImage.localPath;
}
}

async function saveProfile() {
  const saveBtn = document.getElementById("saveProfileBtn");
  const fb = window.JustifiFirebase;

  if (!fb || !fb.isConfigured || !fb.isConfigured()) {
    alert("Firebase is not configured yet.");
    return;
  }

  if (!currentUser) {
    alert("No logged-in user found.");
    return;
  }

  const firstName = getValue("firstName");
  const middleName = getValue("middleName");
  const lastName = getValue("lastName");
  const adminId = getValue("adminId");
  const department = getValue("department");
  const position = getValue("position");
  const school = getValue("school");

  if (!firstName || !lastName) {
    alert("First name and last name are required.");
    return;
  }

  const fullName = [firstName, middleName, lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const isComplete = firstName && lastName && adminId && department && position && school;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    currentUser = await fb.updateCurrentUserProfile({
      firstName,
      middleName,
      lastName,
      fullName,
      adminId,
      department,
      position,
      school,
      profileCompleted: !!isComplete
    });

    renderAdminProfile(currentUser);
    alert("Profile updated successfully.");
  } catch (error) {
    console.error("Failed to save admin profile:", error);
    alert("Failed to save profile.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  }
}

async function loadStudentOverview() {
  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  let students = [];

  try {
    if (fb && fb.isConfigured && fb.isConfigured()) {
      const users = await fb.getAllUsers();
      students = (users || []).filter(u => (u.role || "student") === "student");
    } else if (store && typeof store.getStudents === "function") {
      students = store.getStudents();
    }
  } catch (error) {
    console.error("Failed to load student overview:", error);
    students = [];
  }

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

      // Heuristic: if score is 0..10, treat as /10 and convert to percent.
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
    overviewChart = null;
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
      datasets: [
        {
          label: "Admin Overview",
          data: [
            summary.totalStudents ?? 0,
            summary.activeStudents ?? 0,
            summary.completedProfiles ?? 0,
            summary.studentsWithProgress ?? 0,
            summary.averageQuizScore ?? 0
          ],
          borderWidth: 1
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
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || "";
              const value = context.raw ?? 0;

              if (label === "Average Quiz Score") {
                return `${label}: ${value}%`;
              }

              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#d6cae2"
          },
          grid: {
            color: "rgba(255,255,255,0.08)"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#d6cae2"
          },
          grid: {
            color: "rgba(255,255,255,0.08)"
          }
        }
      }
    }
  });
}


async function handleProfileImageChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file only.");
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
    renderAdminProfile(currentUser);
  } catch (error) {
    console.error("Failed to update profile image:", error);
    alert("Failed to update profile image.");
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
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
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