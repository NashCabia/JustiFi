let allStudents = [];
let selectedStudentId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllStudents();
  setupSearchAndFilter();
  setupModalHandlers();
});

async function loadAllStudents() {
  try {
    const fb = window.JustifiFirebase;
    if (fb && fb.isConfigured && fb.isConfigured()) {
      allStudents = await fb.getStudents();
      // Note: access to this page is restricted to admin accounts via routing; do not perform extra client-side blocking here.
      renderStudentsList(allStudents);
    } else {
      console.log("Firebase not configured");
    }
  } catch (error) {
    console.error("Error loading students:", error);
    window.showFloatingNotification("Failed to load students. " + error.message, "error");
  }
}

function setupSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const gradeFilter = document.getElementById('gradeFilter');
  
  function filterAndRender() {
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const gradeValue = gradeFilter?.value || '';
    
    let filtered = allStudents;
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        (s.email?.toLowerCase().includes(searchTerm)) ||
        (s.firstName?.toLowerCase().includes(searchTerm)) ||
        (s.lastName?.toLowerCase().includes(searchTerm)) ||
        ((s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm))
      );
    }
    
    if (gradeValue) {
      filtered = filtered.filter(s => s.gradeLevel === gradeValue);
    }
    
    renderStudentsList(filtered);
  }
  
  if (searchInput) searchInput.addEventListener('input', filterAndRender);
  if (gradeFilter) gradeFilter.addEventListener('change', filterAndRender);
  
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) searchBtn.addEventListener('click', filterAndRender);
}

function renderStudentsList(students) {
  const list = document.getElementById('studentsList');
  const emptyState = document.getElementById('emptyState');
  const count = document.getElementById('studentCount');
  
  count.textContent = `${students.length} ${students.length === 1 ? 'student' : 'students'}`;
  
  if (!list) return;
  
  list.innerHTML = '';
  
  if (students.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  students.forEach(student => {
    const item = document.createElement('div');
    item.className = 'student-item';
    item.innerHTML = `
      <div class="student-item-info">
        <div class="student-item-name">${student.firstName || ''} ${student.lastName || ''}</div>
        <div class="student-item-details">
          <span>${student.email}</span>
          <span>${student.gradeLevel || 'N/A'}</span>
          <span>${student.section || 'N/A'}</span>
        </div>
      </div>
      <div class="student-item-badge">${student.role}</div>
    `;
    
    item.addEventListener('click', () => openEditModal(student));
    list.appendChild(item);
  });
}

function setupModalHandlers() {
  const modal = document.getElementById('editFormModal');
  const closeBtn = document.querySelector('.close-btn');
  const cancelBtn = document.querySelector('.btn-secondary');
  const form = document.getElementById('editStudentForm');
  
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (form) form.addEventListener('submit', submitEditForm);
  
  document.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function openEditModal(student) {
  selectedStudentId = student.id;
  
  document.getElementById('studentNameDisplay').textContent = 
    `${student.firstName} ${student.lastName}`;
  document.getElementById('editEmail').value = student.email;
  document.getElementById('editFirstName').value = student.firstName || '';
  document.getElementById('editLastName').value = student.lastName || '';
  document.getElementById('editGradeLevel').value = student.gradeLevel || 'Grade 7';
  document.getElementById('editSection').value = student.section || '';
  document.getElementById('editSchool').value = student.school || '';
  
  document.getElementById('editFormModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('editFormModal').classList.add('hidden');
  selectedStudentId = null;
}

async function submitEditForm(e) {
  e.preventDefault();
  
  if (!selectedStudentId) {
    window.showFloatingNotification("No student selected", "error");
    return;
  }
  
  const updates = {
    firstName: document.getElementById('editFirstName').value.trim(),
    lastName: document.getElementById('editLastName').value.trim(),
    gradeLevel: document.getElementById('editGradeLevel').value,
    section: document.getElementById('editSection').value.trim(),
    school: document.getElementById('editSchool').value.trim()
  };
  
  try {
    const fb = window.JustifiFirebase;
    if (!fb || !fb.isConfigured || !fb.isConfigured()) {
      window.showFloatingNotification("Firebase is not configured", "error");
      return;
    }
    
    const db = firebase.firestore();
    await db.collection('users').doc(selectedStudentId).update({
      ...updates,
      fullName: `${updates.firstName} ${updates.lastName}`.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    window.showFloatingNotification("Student information updated successfully!", "success");
    closeModal();
    await loadAllStudents();
  } catch (error) {
    console.error("Error updating student:", error);
    window.showFloatingNotification("Failed to update student: " + error.message, "error");
  }
}
