// Load announcements from Firebase and populate the sticky carousel
(function initFirebaseAnnouncementCarousel() {
  const carousel = document.querySelector(".sticky-carousel");
  if (!carousel) return;

  const stickyWindow = carousel.querySelector(".sticky-window");
  const prevButton = carousel.querySelector(".sticky-prev");
  const nextButton = carousel.querySelector(".sticky-next");

  if (!stickyWindow || !prevButton || !nextButton) return;

  const announcementCollections = ["publicAnnouncements", "announcements"];
  const LOCAL_ANNOUNCEMENTS_KEY = "justifiLocalAnnouncements";

  let announcements = [];
  let activeIndex = 0;
  let autoplayTimer = null;

  function readLocalAnnouncements() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function getAnnouncementTime(item) {
    if (item.createdAt && item.createdAt.toDate) {
      return item.createdAt.toDate().getTime();
    }

    return new Date(item.createdAt || 0).getTime();
  }

  async function fetchAnnouncementsFromCollection(db, collectionName) {
    const snap = await db.collection(collectionName)
      .orderBy("createdAt", "desc")
      .get();

    return snap.docs.map(doc => ({
      id: doc.id,
      source: collectionName,
      ...doc.data()
    })).filter(item => item.title || item.description);
  }

  function createStickyNote(item) {
    const note = document.createElement("article");
    note.className = "sticky-note";
    note.setAttribute("aria-hidden", "true");

    const title = item.title || "Announcement";
    const description = item.description || "No description available.";

    note.dataset.title = title;
    note.dataset.description = description;

    note.innerHTML = `
      <div class="sticky-pin" aria-hidden="true"></div>
      <div class="sticky-content">
        <h3 class="sticky-title"></h3>
        <div class="sticky-body"><p></p></div>
      </div>
    `;

    note.querySelector(".sticky-title").textContent = title;
    note.querySelector(".sticky-body p").textContent = description;

    return note;
  }

  function renderNotes() {
    stickyWindow.innerHTML = "";

    if (!announcements.length) {
      announcements = [
        {
          id: "empty",
          title: "No Announcements",
          description: "Add one from the developer page."
        }
      ];
    }

    announcements.forEach((item) => {
      stickyWindow.appendChild(createStickyNote(item));
    });

    renderCarousel();
    startAutoplay();
  }

  function renderCarousel() {
    const notes = Array.from(stickyWindow.querySelectorAll(".sticky-note"));
    if (!notes.length) return;

    const total = notes.length;
    const prevIndex = (activeIndex - 1 + total) % total;
    const nextIndex = (activeIndex + 1) % total;

    notes.forEach((note, index) => {
      note.classList.remove("is-active", "is-prev", "is-next");
      note.setAttribute("aria-hidden", "true");

      if (index === activeIndex) {
        note.classList.add("is-active");
        note.setAttribute("aria-hidden", "false");
      } else if (total > 1 && index === prevIndex) {
        note.classList.add("is-prev");
      } else if (total > 1 && index === nextIndex) {
        note.classList.add("is-next");
      }
    });

    prevButton.style.display = total > 1 ? "" : "none";
    nextButton.style.display = total > 1 ? "" : "none";
  }

  function goTo(offset) {
    const notes = stickyWindow.querySelectorAll(".sticky-note");
    if (notes.length <= 1) return;

    activeIndex = (activeIndex + offset + notes.length) % notes.length;
    renderCarousel();
  }

//   function stopAutoplay() {
//   if (autoplayTimer) {
//     clearInterval(autoplayTimer);
//     autoplayTimer = null;
//   }
// }

// function resumeAutoplay() {
//   stopAutoplay();

//   if (announcements.length <= 1) return;

//   autoplayTimer = setInterval(() => {
//     goTo(1);
//   }, 10000);
// }

// function startAutoplay() {
//   resumeAutoplay();
// }

  async function loadAnnouncements() {
    const localAnnouncements = readLocalAnnouncements();

    try {
      let db = null;

      if (window.firebase && window.JUSTIFI_FIREBASE_CONFIG) {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.JUSTIFI_FIREBASE_CONFIG);
        }

        db = firebase.firestore();
      } else {
        const fb = window.JustifiFirebase;

        if (fb && fb.getFirestore) {
          db = fb.getFirestore();
        }
      }

      if (!db) throw new Error("Firebase is not initialized yet.");

      const snapshots = await Promise.all(
        announcementCollections.map(collectionName =>
          fetchAnnouncementsFromCollection(db, collectionName).catch(() => [])
        )
      );

      const merged = new Map();

      for (const rows of snapshots) {
        for (const row of rows) {
          if (!merged.has(row.id) || row.source === "publicAnnouncements") {
            merged.set(row.id, row);
          }
        }
      }

      announcements = Array.from(merged.values());

      for (const localItem of localAnnouncements) {
        if (!announcements.some(row => row.id === localItem.id)) {
          announcements.push(localItem);
        }
      }

      announcements.sort((a, b) => getAnnouncementTime(b) - getAnnouncementTime(a));

      activeIndex = 0;
      renderNotes();
    } catch (error) {
      console.error("Error loading announcements from Firebase:", error);

      announcements = localAnnouncements.sort(
        (a, b) => getAnnouncementTime(b) - getAnnouncementTime(a)
      );

      activeIndex = 0;
      renderNotes();
    }
  }

  prevButton.onclick = () => goTo(-1);
  nextButton.onclick = () => goTo(1);

  loadAnnouncements();
})(); 
