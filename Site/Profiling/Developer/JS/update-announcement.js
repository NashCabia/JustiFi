let announcements = [];
let editingId = null;
let currentUser = null;
let isDeveloper = false;

const PRIMARY_ANNOUNCEMENT_COLLECTION = 'publicAnnouncements';
const OPTIONAL_MIRROR_COLLECTIONS = ['announcements'];
const ANNOUNCEMENT_COLLECTIONS = [PRIMARY_ANNOUNCEMENT_COLLECTION, ...OPTIONAL_MIRROR_COLLECTIONS];
const LOCAL_ANNOUNCEMENTS_KEY = 'justifiLocalAnnouncements';

function readLocalAnnouncements() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLocalAnnouncements(rows) {
  localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
}

function upsertLocalAnnouncement(id, title, description) {
  const nowIso = new Date().toISOString();
  const rows = readLocalAnnouncements();
  const index = rows.findIndex(row => row && row.id === id);

  if (index >= 0) {
    rows[index] = {
      ...rows[index],
      title,
      description,
      updatedAt: nowIso,
      source: 'local'
    };
  } else {
    rows.push({
      id,
      title,
      description,
      createdAt: nowIso,
      updatedAt: nowIso,
      source: 'local'
    });
  }

  writeLocalAnnouncements(rows);
}

function deleteLocalAnnouncement(id) {
  const rows = readLocalAnnouncements().filter(row => row && row.id !== id);
  writeLocalAnnouncements(rows);
}

function isPermissionDenied(error) {
  return !!(error && (error.code === 'permission-denied' || /permission/i.test(error.message || '')));
}

document.addEventListener('DOMContentLoaded', async () => {
  setupFormHandlers();

  // Determine current auth state first
  try {
    const fb = window.JustifiFirebase;
    if (fb && fb.isConfigured && fb.isConfigured() && fb.getCurrentUser) {
      currentUser = await fb.getCurrentUser();

      if (!currentUser && window.firebase && firebase.auth) {
        currentUser = await new Promise((resolve) => {
          const unsubscribe = firebase.auth().onAuthStateChanged(async () => {
            unsubscribe();
            try {
              resolve(await fb.getCurrentUser());
            } catch (error) {
              console.error("Failed to restore developer user:", error);
              resolve(null);
            }
          });
        });
      }

      isDeveloper = !!(
        currentUser &&
        (currentUser.role || '').toLowerCase() === 'developer'
      );
    }
  } catch (err) {
    console.warn('Could not determine current user:', err);
  }

  updateFormVisibility();

  // Load announcements AFTER developer status is known
  await loadAnnouncements();
});

function updateFormVisibility() {
  const form = document.getElementById('announcementForm');
  if (!form) return;

  if (!isDeveloper) {
    // disable inputs and show hint
    form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
    const titleEl = document.getElementById('formTitle');
    if (titleEl) titleEl.textContent = 'Sign in as Developer to manage announcements';
  } else {
    form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
    const titleEl = document.getElementById('formTitle');
    if (titleEl) titleEl.textContent = 'Add New Announcement';
  }
}

async function loadAnnouncements() {
  const localRows = readLocalAnnouncements();

  try {
    const fb = window.JustifiFirebase;
    if (fb && fb.isConfigured && fb.isConfigured()) {
      const db = fb.getFirestore ? fb.getFirestore() : firebase.firestore();
      if (!db) {
        throw new Error("Firebase is not initialized yet.");
      }

      const snapshots = await Promise.all(
        ANNOUNCEMENT_COLLECTIONS.map(async (collectionName) => {
          try {
            const snap = await db.collection(collectionName)
              .orderBy('createdAt', 'desc')
              .get();

            return snap.docs.map(doc => ({
              id: doc.id,
              source: collectionName,
              ...doc.data()
            }));
          } catch (collectionError) {
            console.warn(`Skipping announcement collection ${collectionName}:`, collectionError);
            return [];
          }
        })
      );

      const merged = new Map();
      for (const rows of snapshots) {
        for (const row of rows) {
          if (!merged.has(row.id) || row.source === 'publicAnnouncements') {
            merged.set(row.id, row);
          }
        }
      }

      for (const localRow of localRows) {
        if (!merged.has(localRow.id)) {
          merged.set(localRow.id, localRow);
        }
      }

      announcements = Array.from(merged.values())
        .sort((a, b) => formatSortDate(b.createdAt) - formatSortDate(a.createdAt));
      renderAnnouncements();
      return;
    }
  } catch (error) {
    console.error("Error loading announcements:", error);
  }

  announcements = localRows
    .slice()
    .sort((a, b) => formatSortDate(b.createdAt) - formatSortDate(a.createdAt));
  
  renderAnnouncements();
}

function setupFormHandlers() {
  const form = document.getElementById('announcementForm');
  const resetBtn1 = document.getElementById('resetFormBtn');
  const resetBtn2 = document.getElementById('resetFormBtn2');
  const descriptionInput = document.getElementById('announcementDescription');
 
  
  form?.addEventListener('submit', submitAnnouncement);
  resetBtn1?.addEventListener('click', resetForm);
  resetBtn2?.addEventListener('click', resetForm);

  if (descriptionInput) {
    descriptionInput.addEventListener('focus', () => {
      if (descriptionInput.value.trim() === '') {
        descriptionInput.value = '• ';
      }
    });

    descriptionInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;

      e.preventDefault();

      const start = descriptionInput.selectionStart;
      const end = descriptionInput.selectionEnd;
      const value = descriptionInput.value;

      const beforeCursor = value.substring(0, start);
      const currentLine = beforeCursor.split('\n').pop();

      // If current bullet is empty, pressing Enter stops the bullet list
      if (currentLine.trim() === '•') {
        const newValue =
          value.substring(0, start - currentLine.length) +
          value.substring(end);

        descriptionInput.value = newValue;
        descriptionInput.selectionStart = descriptionInput.selectionEnd =
          start - currentLine.length;

        return;
      }

      const newValue =
        value.substring(0, start) +
        '\n• ' +
        value.substring(end);

      descriptionInput.value = newValue;
      descriptionInput.selectionStart = descriptionInput.selectionEnd = start + 3;
    });
  }
}

async function submitAnnouncement(e) {
  e.preventDefault();
  
  const title = document.getElementById('announcementTitle').value.trim();
  const description = document.getElementById('announcementDescription').value.trim();
  
  if (!title || !description) {
    window.showFloatingNotification("Title and description are required", "error");
    return;
  }
  
  try {
    const fb = window.JustifiFirebase;
    if (!fb || !fb.isConfigured || !fb.isConfigured()) {
      window.showFloatingNotification("Firebase is not configured", "error");
      return;
    }

    // No explicit permission check here — the developer area restricts access.
    // Proceed to save without requiring an additional developer session.
    
    const db = fb.getFirestore ? fb.getFirestore() : firebase.firestore();
    if (!db) {
      throw new Error("Firebase is not initialized yet.");
    }

    const payload = {
      title,
      description,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingId) {
      try {
        await db.collection(PRIMARY_ANNOUNCEMENT_COLLECTION).doc(editingId).set(payload, { merge: true });
        await Promise.all(
          OPTIONAL_MIRROR_COLLECTIONS.map((collectionName) =>
            db.collection(collectionName).doc(editingId).set(payload, { merge: true }).catch(() => null)
          )
        );
        window.showFloatingNotification("Announcement updated successfully!", "success");
      } catch (saveError) {
        if (!isPermissionDenied(saveError)) {
          throw saveError;
        }

        upsertLocalAnnouncement(editingId, title, description);
        window.showFloatingNotification("Firestore denied update. Announcement saved locally for homepage sticky notes.", "success");
      }
    } else {
      const createdId = db.collection(PRIMARY_ANNOUNCEMENT_COLLECTION).doc().id;
      const createPayload = {
        title,
        description,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await db.collection(PRIMARY_ANNOUNCEMENT_COLLECTION).doc(createdId).set(createPayload);
        await Promise.all(
          OPTIONAL_MIRROR_COLLECTIONS.map((collectionName) =>
            db.collection(collectionName).doc(createdId).set(createPayload).catch(() => null)
          )
        );
        window.showFloatingNotification("Announcement added successfully!", "success");
      } catch (saveError) {
        if (!isPermissionDenied(saveError)) {
          throw saveError;
        }

        upsertLocalAnnouncement(createdId, title, description);
        window.showFloatingNotification("Firestore denied create. Announcement saved locally for homepage sticky notes.", "success");
      }
    }
    
    resetForm();
    await loadAnnouncements();
  } catch (error) {
    console.error("Error saving announcement:", error);
    const isPerm = isPermissionDenied(error);
    if (isPerm) {
      window.showFloatingNotification("Failed to save announcement due to Firestore permissions and local fallback was not available.", "error");
    } else {
      window.showFloatingNotification("Failed to save announcement: " + (error && error.message ? error.message : 'Unknown error'), "error");
    }
  }
}

function resetForm() {
  document.getElementById('announcementForm').reset();
  document.getElementById('announcementDescription').value = '• ';
  document.getElementById('formTitle').textContent = "Add New Announcement";
  document.getElementById('submitBtn').textContent = "Add Announcement";
  document.getElementById('resetFormBtn').style.display = "none";
  editingId = null;
}

function editAnnouncement(id) {
  const announcement = announcements.find(a => a.id === id);
  if (!announcement) return;
  
  editingId = id;
  document.getElementById('announcementTitle').value = announcement.title;
  document.getElementById('announcementDescription').value = announcement.description;
  document.getElementById('formTitle').textContent = `Edit Announcement`;
  document.getElementById('submitBtn').textContent = "Update Announcement";
  document.getElementById('resetFormBtn').style.display = "block";
  
  document.querySelector('.announcement-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteAnnouncement(id) {
  if (!confirm("Are you sure you want to delete this announcement?")) {
    return;
  }
  
  try {
    const fb = window.JustifiFirebase;
    if (!fb || !fb.isConfigured || !fb.isConfigured()) {
      window.showFloatingNotification("Firebase is not configured", "error");
      return;
    }

    // No explicit permission check here — the developer area restricts access.
    // Proceed to delete without requiring an additional developer session.
    
    const db = fb.getFirestore ? fb.getFirestore() : firebase.firestore();
    if (!db) {
      throw new Error("Firebase is not initialized yet.");
    }
    let deletedFromRemote = false;

    try {
      await Promise.all(
        ANNOUNCEMENT_COLLECTIONS.map((collectionName) =>
          db.collection(collectionName).doc(id).delete().catch(() => null)
        )
      );
      deletedFromRemote = true;
    } catch (deleteError) {
      if (!isPermissionDenied(deleteError)) {
        throw deleteError;
      }
    }

    deleteLocalAnnouncement(id);

    if (deletedFromRemote) {
      window.showFloatingNotification("Announcement deleted successfully!", "success");
    } else {
      window.showFloatingNotification("Firestore denied delete. Local announcement entry was removed.", "success");
    }

    await loadAnnouncements();
  } catch (error) {
    console.error("Error deleting announcement:", error);
    window.showFloatingNotification("Failed to delete announcement: " + error.message, "error");
  }
}

function renderAnnouncements() {
  const list = document.getElementById('announcementsList');
  const emptyState = document.getElementById('emptyState');
  const count = document.getElementById('announcementCount');
  
  count.textContent = `${announcements.length} ${announcements.length === 1 ? 'announcement' : 'announcements'}`;
  
  if (announcements.length === 0) {
    list.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  list.innerHTML = announcements.map(ann => {
    const actions = isDeveloper ? `
      <button class="action-btn" onclick="editAnnouncement('${ann.id}')">Edit</button>
      <button class="action-btn delete" onclick="deleteAnnouncement('${ann.id}')">Delete</button>
    ` : '';

    return `
      <div class="announcement-item">
        <div class="announcement-item-header">
          <h3 class="announcement-item-title">${escapeHtml(ann.title)}</h3>
          <span class="announcement-item-date">${formatDate(ann.createdAt)}</span>
        </div>
        <p class="announcement-item-description">${escapeHtml(ann.description)}</p>
        <div class="announcement-item-actions">${actions}</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '';
  }
}

function formatSortDate(timestamp) {
  if (!timestamp) return 0;
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.getTime();
  } catch (error) {
    return 0;
  }
}
