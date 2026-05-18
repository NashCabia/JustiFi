let allUsers = [];
let unsubscribeUsers = null;

function showFloatingNotification(message, type = "success") {
  let panel = document.getElementById("notificationPanel");
  
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "notificationPanel";
    panel.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
    `;
    
    if (type === "success") {
      panel.style.backgroundColor = "#4caf50";
      panel.style.color = "#fff";
    } else if (type === "error") {
      panel.style.backgroundColor = "#f44336";
      panel.style.color = "#fff";
    } else {
      panel.style.backgroundColor = "#2196f3";
      panel.style.color = "#fff";
    }
    
    document.body.appendChild(panel);
    
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  panel.textContent = message;
  if (type === "success") {
    panel.style.backgroundColor = "#4caf50";
    panel.style.color = "#fff";
  } else if (type === "error") {
    panel.style.backgroundColor = "#f44336";
    panel.style.color = "#fff";
  } else {
    panel.style.backgroundColor = "#2196f3";
    panel.style.color = "#fff";
  }
  panel.style.display = "block";
  
  setTimeout(() => {
    panel.style.display = "none";
  }, 3000);
}

function startUsersListener() {
  try {
    const fb = window.JustifiFirebase;
    if (fb && fb.isConfigured && fb.isConfigured()) {
      if (unsubscribeUsers) {
        unsubscribeUsers();
      }

      unsubscribeUsers = fb.subscribeToUsers((users) => {
        allUsers = Array.isArray(users) ? users : [];
        applySearchAndFilter();
      }, (error) => {
        console.error("Failed to load users:", error);
        allUsers = [];
        applySearchAndFilter();
      });
    } else {
      allUsers = [];
      applySearchAndFilter();
    }
  } catch (error) {
    console.error("Failed to load users:", error);
    allUsers = [];
    applySearchAndFilter();
  }
}

function applySearchAndFilter() {
  const searchInput = document.getElementById("searchInput").value.toLowerCase();
  const roleFilter = document.getElementById("roleFilter").value;

  let filtered = [...allUsers];
  
  // Exclude developer accounts from the list
  filtered = filtered.filter((user) => (user.role || 'student') !== 'developer');
  
  // Apply role filter
  if (roleFilter) {
    filtered = filtered.filter((user) => (user.role || 'student') === roleFilter);
  }
  
  // Apply search filter
  if (searchInput) {
    filtered = filtered.filter((user) => {
      const email = (user.email || "").toLowerCase();
      const firstName = (user.firstName || "").toLowerCase();
      const lastName = (user.lastName || "").toLowerCase();
      return email.includes(searchInput) || firstName.includes(searchInput) || lastName.includes(searchInput);
    });
  }

  renderUsersList(filtered);
}

function renderUsersList(users) {
  const usersList = document.getElementById("usersList");
  const noUsersMessage = document.getElementById("noUsersMessage");

  if (!users || users.length === 0) {
    usersList.innerHTML = "";
    noUsersMessage.style.display = "block";
    return;
  }

  noUsersMessage.style.display = "none";
  usersList.innerHTML = users
    .map(
      (user) => `
        <div class="user-item" data-email="${escapeHtml(user.email)}">
          <div class="user-info">
            <div class="user-name">${escapeHtml(user.firstName || "")} ${escapeHtml(user.lastName || "")}</div>
            <div class="user-email">${escapeHtml(user.email || "")}</div>
            <div class="user-role">Role: <strong>${escapeHtml(user.role || "student")}</strong></div>
          </div>
          <button class="select-btn" type="button">Select</button>
        </div>
      `
    )
    .join("");

  // Add click handlers
  usersList.querySelectorAll(".user-item").forEach((item) => {
    item.addEventListener("click", () => {
      const email = item.dataset.email;
      const user = allUsers.find((u) => u.email === email);
      if (user) {
        showRoleAssignmentForm(user);
      }
    });
  });
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return (text || "").replace(/[&<>"']/g, (char) => map[char]);
}

function showRoleAssignmentForm(user) {
  document.getElementById("selectedUserName").textContent = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  document.getElementById("selectedEmail").value = user.email;
  document.getElementById("newRole").value = user.role || "student";
  document.getElementById("roleAssignmentForm").classList.remove("hidden");

  updateFieldVisibility();
}

function updateFieldVisibility() {
  const newRole = document.getElementById("newRole").value;
  document.getElementById("gradeField").style.display = newRole === "teacher" ? "block" : "none";
  document.getElementById("sectionField").style.display = newRole === "teacher" ? "block" : "none";
}

function submitRoleUpdate() {
  const email = document.getElementById("selectedEmail").value;
  const newRole = document.getElementById("newRole").value;
  const gradeLevel = document.getElementById("newGradeLevel").value;
  const section = document.getElementById("newSection").value;

  if (!email) {
    showFloatingNotification("Email is required", "error");
    return;
  }

  const fb = window.JustifiFirebase;
  if (fb && fb.isConfigured && fb.isConfigured()) {
    fb.updateUserRoleByEmail(email, newRole, gradeLevel, section)
      .then(() => {
        showFloatingNotification("Role updated successfully!", "success");
        document.getElementById("roleAssignmentForm").classList.add("hidden");
        applySearchAndFilter();
      })
      .catch((error) => {
        showFloatingNotification("Error updating role: " + error.message, "error");
      });
  } else {
    showFloatingNotification("Firebase is not configured", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  startUsersListener();

  document.getElementById("searchInput").addEventListener("input", applySearchAndFilter);
  document.getElementById("roleFilter").addEventListener("change", applySearchAndFilter);
  document.getElementById("searchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applySearchAndFilter();
    }
  });

  document.querySelector(".search-btn").addEventListener("click", applySearchAndFilter);

  document.getElementById("newRole").addEventListener("change", updateFieldVisibility);

  document.getElementById("submitRoleBtn").addEventListener("click", submitRoleUpdate);

  document.querySelector(".close-form-btn").addEventListener("click", () => {
    document.getElementById("roleAssignmentForm").classList.add("hidden");
  });
});
