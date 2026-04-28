const assignRoleBtn = document.getElementById('assignRoleBtn');

async function assignRole() {
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const fb = window.JustifiFirebase;
  const store = window.JustifiStore;

  if (!email) {
    alert('Please enter a user email.');
    return;
  }

  try {
    if (fb && fb.isConfigured && fb.isConfigured()) {
      await fb.updateUserRoleByEmail(email, role);
    } else {
      let users = store.getUsers();
      const user = users.find(u => String(u.email).toLowerCase() === email.toLowerCase());
      if (!user) throw new Error('User not found.');
      user.role = role;
      store.saveUsers(users);
    }
    alert('Role updated successfully!');
  } catch (error) {
    alert(error.message);
  }
}

if (assignRoleBtn) {
  assignRoleBtn.addEventListener('click', assignRole);
}
