document.addEventListener("DOMContentLoaded", async () => {
  console.log("[view.js] DOMContentLoaded");

  try {
    const navUserName = document.getElementById("navUserName");
    // Bind admin name
    try {
      const fb = window.JustifiFirebase;
      if (fb && fb.isConfigured && fb.isConfigured()) {
        const currentUser = await fb.getCurrentUser();
        if (currentUser && navUserName) {
          const displayName = fb.getDisplayName ? fb.getDisplayName(currentUser) : currentUser.email;
          navUserName.textContent = displayName;
        }
      }
    } catch (error) {
      console.error("Error binding admin name:", error);
    }

    // Menu handlers (if any)
    const menuBtn = document.getElementById("menuBtn");
    const closeMenuBtn = document.getElementById("closeMenuBtn");
    const sideMenu = document.getElementById("sideMenu");
    const menuOverlay = document.getElementById("menuOverlay");

    function openMenu() {
      if (sideMenu) sideMenu.classList.add("open");
      if (menuOverlay) menuOverlay.classList.remove("hidden");
    }

    function closeMenu() {
      if (sideMenu) sideMenu.classList.remove("open");
      if (menuOverlay) menuOverlay.classList.add("hidden");
    }

    if (menuBtn) menuBtn.addEventListener("click", openMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("id") || params.get("uid");
    console.log("[view.js] studentId param:", studentId);

    const studentNameEl = document.getElementById("student-name");
    const completedLessonsEl = document.getElementById("completedLessons");
    const badgeCountEl = document.getElementById("badgeCount");
    const quizAverageEl = document.getElementById("quizAverage");
    const chartCanvas = document.getElementById("progressChart");

    let student = null;
    let chartInstance = null;
    let unsubscribeStudent = null;

    function renderStudentOverview(currentStudent) {
      const fullName =
        currentStudent.fullName ||
        [currentStudent.firstName, currentStudent.lastName].filter(Boolean).join(" ").trim() ||
        (currentStudent.email || "Student");

      const progressData = Array.isArray(currentStudent.progress) ? currentStudent.progress : [];
      const completedLessons = progressData.length;
      const badgeCount = Array.isArray(currentStudent.badges) ? currentStudent.badges.length : 0;
      const quizScores = Array.isArray(currentStudent.quizScores)
        ? currentStudent.quizScores
        : progressData;
      const quizAverage = quizScores.length
        ? Math.round(quizScores.reduce((a, b) => a + Number(b || 0), 0) / quizScores.length)
        : 0;

      if (studentNameEl) studentNameEl.textContent = fullName;
      if (completedLessonsEl) completedLessonsEl.textContent = completedLessons;
      if (badgeCountEl) badgeCountEl.textContent = badgeCount;
      if (quizAverageEl) quizAverageEl.textContent = `${quizAverage}%`;

      if (chartCanvas && typeof Chart !== "undefined") {
        const labels = quizScores.map((_, i) => `Quiz ${i + 1}`);

        if (chartInstance) {
          chartInstance.destroy();
        }

        chartInstance = new Chart(chartCanvas, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Quiz Score",
                data: quizScores,
                borderWidth: 2,
                tension: 0.3,
                borderColor: "#1c1132",
                backgroundColor: "rgba(28, 17, 50, 0.12)"
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: "#1c1132"
                }
              }
            },
            scales: {
              x: {
                ticks: { color: "#1c1132" },
                grid: { color: "rgba(0,0,0,0.08)" }
              },
              y: {
                beginAtZero: true,
                max: 100,
                ticks: { color: "#1c1132" },
                grid: { color: "rgba(0,0,0,0.08)" }
              }
            }
          }
        });
      }
    }

    // Attempt to load from Firebase
    try {
      console.log("[view.js] firebase global:", !!window.firebase, "firebase.apps.length:", window.firebase && window.firebase.apps ? window.firebase.apps.length : "n/a");
      const fb = window.JustifiFirebase;
      console.log("[view.js] JustifiFirebase present:", !!fb, "isConfigured():", fb && typeof fb.isConfigured === "function" ? fb.isConfigured() : "n/a");

      if (!fb || !fb.isConfigured || !fb.isConfigured()) {
        console.warn("[view.js] Firebase not configured or JustifiFirebase missing.");
        if (window.showFloatingNotification) {
          window.showFloatingNotification("Firebase not configured. Student data cannot load.", "error");
        } else {
          showFloatingPanel("Firebase not configured. Student data cannot load.", "error");
        }
        if (!window.firebase) {
          throw new Error("No firebase available");
        }
      }

      if (studentNameEl) studentNameEl.textContent = "Loading...";

      if (studentId && window.firebase) {
        const db = firebase.firestore();
        console.log("[view.js] initializing firestore onSnapshot for user:", studentId);
        unsubscribeStudent = db.collection("users").doc(studentId).onSnapshot(async (studentDoc) => {
          console.log("[view.js] onSnapshot fired for:", studentId, "exists:", studentDoc.exists);
          if (studentDoc.exists) {
            const data = studentDoc.data();
            console.log("[view.js] studentDoc.data():", data);
            student = { id: studentId, ...data };
            renderStudentOverview(student);
          } else {
            console.warn("[view.js] Student document not found by id:", studentId);
            // Fallback by email when id looks like email
            try {
              const maybeEmail = decodeURIComponent(studentId || "");
              if (maybeEmail.includes("@")) {
                console.log("[view.js] attempting fallback lookup by email:", maybeEmail);
                const q = await db.collection("users").where("email", "==", maybeEmail).limit(1).get();
                if (!q.empty) {
                  const doc = q.docs[0];
                  const data = doc.data();
                  console.log("[view.js] fallback email lookup found:", doc.id, data);
                  student = { id: doc.id, ...data };
                  renderStudentOverview(student);
                  return;
                }
              }
            } catch (err) {
              console.error("[view.js] fallback email lookup failed:", err);
            }

            student = null;
            if (window.showFloatingNotification) {
              window.showFloatingNotification("Student not found in Firebase.", "error");
            } else {
              showFloatingPanel("Student not found in Firebase.", "error");
            }
          }
        }, (snapshotError) => {
          console.error("Error listening to student from Firebase:", snapshotError);
        });
      } else {
        console.warn("[view.js] No studentId provided or no firebase available.");
      }
    } catch (error) {
      console.error("Error fetching student from Firebase:", error);
    }

    if (!student) {
      student = {
        firstName: "Student",
        lastName: "",
        progress: [],
        badges: [],
        quizScores: []
      };

      renderStudentOverview(student);
    }

    window.addEventListener("beforeunload", () => {
      if (unsubscribeStudent) unsubscribeStudent();
      if (chartInstance) chartInstance.destroy();
    });
  } catch (err) {
    console.error("[view.js] initialization failed:", err);
  }
});

function showFloatingPanel(message, type = "success") {
  const panel = document.getElementById("floatingPanel");
  const text = document.getElementById("floatingPanelMessage");

  if (!panel || !text) {
    return;
  }

  text.textContent = message;
  panel.className = `floating-panel ${type}`;

  setTimeout(() => {
    panel.classList.add("hidden");
  }, 3000);
}