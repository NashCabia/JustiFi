function goToDashboard() {
  window.location.href = "../admindash.html";
}

function goToProfile() {
  window.location.href = "../Profile/admin.html";
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
    showFloatingPanel("Logout failed. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();
  await bindAdminName();
  await loadStudents();
});

async function bindAdminName() {
  const navUserName = document.getElementById("navUserName");
  if (!navUserName) return;

  try {
    const fb = window.JustifiFirebase;
    const store = window.JustifiStore;
    const user = fb && fb.isConfigured && fb.isConfigured()
      ? (await fb.getCurrentUser()) || (await waitForAuthenticatedUser())
      : (store ? store.getCurrentUser() : null);

    const name = user
      ? ((fb && fb.getDisplayName ? fb.getDisplayName(user) : null) || user.firstName || user.email || "Admin")
      : "Admin";

    navUserName.textContent = name;
  } catch (_) {
    navUserName.textContent = "Admin";
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

async function loadStudents() {
  const list = document.getElementById("student-list");
  const searchInput = document.getElementById("studentSearch");
  if (!list) return;

  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  let students = [];

  try {
    if (fb && fb.isConfigured && fb.isConfigured()) {
      const currentAdmin = await fb.getCurrentUser();
students = await fb.getStudents(currentAdmin);
    } else if (store && typeof store.getStudents === "function") {
      students = store.getStudents();
    }
  } catch (error) {
    console.error("Failed to load students:", error);
    students = [];
  }

  function renderStudents(items) {
    list.innerHTML = "";

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">No students found.</div>`;
      return;
    }

    items.forEach((student, idx) => {
      const card = document.createElement("div");
      card.className = "student-card";

      const fullName =
        student.fullName ||
        [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ").trim() ||
        student.email ||
        `Student ${idx + 1}`;

      const email = student.email || "No email available";
      const role = student.role || "student";
      const id = student.id || student.uid || `student-${idx + 1}`;

      card.innerHTML = `
        <div class="student-main">
          <h3>${fullName}</h3>
          <p>${email}</p>
          <p>Role: ${role}</p>
        </div>
        <div class="student-action">View Progress →</div>
      `;

      card.addEventListener("click", () => {
        window.location.href = `Students-View/students-view.html?id=${encodeURIComponent(id)}`;
      });

      list.appendChild(card);
    });
  }

 const progressFilter = document.getElementById("progressFilter");
const gradeFilter = document.getElementById("gradeFilter");
const sectionFilter = document.getElementById("sectionFilter");

function getAverageProgress(student) {
  const progress = Array.isArray(student.progress) ? student.progress : [];
  if (!progress.length) return 0;

  const total = progress.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / progress.length;
}

function applyFilters() {
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const progressSort = progressFilter ? progressFilter.value : "";
  const grade = gradeFilter ? gradeFilter.value.toLowerCase().trim() : "";
  const section = sectionFilter ? sectionFilter.value.toLowerCase().trim() : "";

  let filtered = students.filter((student, idx) => {
    const fullName =
      student.fullName ||
      [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      `Student ${idx + 1}`;

    const matchesName = fullName.toLowerCase().includes(keyword);
    const matchesGrade =
      !grade || String(student.gradeLevel || "").toLowerCase().includes(grade);
    const matchesSection =
      !section || String(student.section || "").toLowerCase().includes(section);

    return matchesName && matchesGrade && matchesSection;
  });

  if (progressSort === "high") {
    filtered.sort((a, b) => getAverageProgress(b) - getAverageProgress(a));
  }

  if (progressSort === "low") {
    filtered.sort((a, b) => getAverageProgress(a) - getAverageProgress(b));
  }

  renderStudents(filtered);
}

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (progressFilter) progressFilter.addEventListener("change", applyFilters);
if (gradeFilter) gradeFilter.addEventListener("input", applyFilters);
if (sectionFilter) sectionFilter.addEventListener("input", applyFilters);
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
