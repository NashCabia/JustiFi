const assignRoleBtn = document.getElementById('assignRoleBtn');

async function assignRole() {
  const email = document.getElementById("email").value.trim();
  const role = document.getElementById("role").value;
  const assignedGradeLevel = document.getElementById("assignedGradeLevel").value.trim();
  const assignedSection = document.getElementById("assignedSection").value.trim();

  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  if (!email) {
    alert("Please enter a user email.");
    return;
  }

  if (role === "teacher" && (!assignedGradeLevel || !assignedSection)) {
    alert("Please assign both grade level and section for teacher accounts.");
    return;
  }

  try {
    if (fb && fb.isConfigured && fb.isConfigured()) {
      await fb.updateUserRoleByEmail(email, role, assignedGradeLevel, assignedSection);
    } else {
      let users = store.getUsers();
      const user = users.find(u => String(u.email).toLowerCase() === email.toLowerCase());

      if (!user) throw new Error("User not found.");

      user.role = role;
      user.assignedGradeLevel = role === "teacher" ? assignedGradeLevel : "";
      user.assignedSection = role === "teacher" ? assignedSection : "";

      store.saveUsers(users);
    }

    alert("Role and section assignment updated successfully!");
  } catch (error) {
    alert(error.message);
  }
}

if (assignRoleBtn) {
  assignRoleBtn.addEventListener('click', assignRole);
}
