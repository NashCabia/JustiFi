// ===============================
// CHARACTER CARD DECK (DRAG TO SWITCH)
// ===============================

(function initCharacterDeck() {
  const deck = document.querySelector(".card-stack");
  const info = document.querySelector(".character-info");
  const charName = document.getElementById("char-name");
  const charDesc = document.getElementById("char-desc");

  if (!deck) return;

  // Placeholder character data (consistent)
  const characterData = [
    {
      name: "Student Alpha",
      desc: "A disciplined academy prodigy known for tactical precision and calm leadership under pressure. Specializes in strategic combat planning."
    },
    {
      name: "Student Beta",
      desc: "Energetic and fearless, this student excels in fast-paced encounters. Known for adaptability and relentless offensive skills."
    },
    {
      name: "Student Gamma",
      desc: "Quiet and analytical, mastering advanced techniques through intelligence and patience. A powerful force when fully unleashed."
    }
  ];

  const canUpdateInfo = !!(info && charName && charDesc);
  let index = 0;

  function showCharacter(i) {
    if (!canUpdateInfo) return;

    info.classList.add("fade");

    window.setTimeout(() => {
      charName.textContent = characterData[i].name;
      charDesc.textContent = characterData[i].desc;
      info.classList.remove("fade");
    }, 200);
  }

  function layoutCards() {
    const cards = Array.from(deck.querySelectorAll(".swipe-card"));
    cards.forEach((card, i) => {
      const offsetX = i * 26;
      const offsetY = i * 18;
      const scale = 1 - i * 0.04;
      const tilt = i * -2;

      card.style.zIndex = String(10 - i);
      card.style.opacity = i < 3 ? "1" : "0";
      card.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${tilt}deg) scale(${scale})`;
      card.setAttribute("aria-hidden", i === 0 ? "false" : "true");
    });
  }

  const SWIPE_THRESHOLD_PX = 90;
  let activeCard = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;

  function onPointerDown(e) {
    const topCard = deck.querySelector(".swipe-card");
    if (!topCard) return;
    if (e.target && !topCard.contains(e.target)) return;

    activeCard = topCard;
    startX = e.clientX;
    startY = e.clientY;
    currentX = 0;
    currentY = 0;
    isDragging = true;

    activeCard.classList.add("dragging");
    try {
      activeCard.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore capture errors (can happen in some environments)
    }
  }

  function onPointerMove(e) {
    if (!isDragging || !activeCard) return;

    currentX = e.clientX - startX;
    currentY = e.clientY - startY;

    const rotate = currentX / 14;
    activeCard.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
  }

  function finishSwipe() {
    if (!activeCard) return;

    activeCard.classList.remove("dragging");

    // Move the swiped card to the back of the stack
    deck.appendChild(activeCard);
    activeCard = null;
    isDragging = false;

    if (canUpdateInfo) {
      index = (index + 1) % characterData.length;
      showCharacter(index);
    }
    layoutCards();
  }

  function cancelSwipe() {
    if (!activeCard) return;
    activeCard.classList.remove("dragging");
    activeCard = null;
    isDragging = false;
    layoutCards();
  }

  function onPointerUp() {
    if (!isDragging || !activeCard) return;

    if (Math.abs(currentX) >= SWIPE_THRESHOLD_PX) {
      const direction = currentX < 0 ? -1 : 1;
      const flyX = direction * (deck.clientWidth + 240);
      const flyY = currentY * 0.4;
      const rotate = direction * 20;

      activeCard.classList.remove("dragging");
      activeCard.style.transform = `translate(${flyX}px, ${flyY}px) rotate(${rotate}deg)`;

      window.setTimeout(() => {
        finishSwipe();
      }, 220);
      return;
    }

    cancelSwipe();
  }

  // Pointer events are attached to the deck, but only the top card is draggable.
  deck.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", cancelSwipe);

  // Initialize
  showCharacter(index);
  layoutCards();
})();


// ===============================
// EXPLORE BUTTON SCROLL
// ===============================

const exploreBtn = document.querySelector(".explore-btn");

if (exploreBtn) {
  exploreBtn.addEventListener("click", () => {
    document.querySelector("#about").scrollIntoView({
      behavior: "smooth"
    });
  });
}


// ===============================
// NAVBAR BACKGROUND ON SCROLL
// ===============================

const navbar = document.querySelector(".navbar");

if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.style.setProperty("--navbar-alpha", "0.96");
    } else {
      navbar.style.setProperty("--navbar-alpha", "0.85");
    }
  });
}


// ===============================
// SCROLL REVEAL ANIMATION
// ===============================

const sections = document.querySelectorAll(".content");

window.addEventListener("scroll", () => {
  sections.forEach(section => {
    const sectionTop = section.getBoundingClientRect().top;
    if (sectionTop < window.innerHeight - 100) {
      section.classList.add("show");
    }
  });
});


// ===============================
// HEADER ↔ SIDEBAR SYNC SYSTEM
// ===============================

const floatingNav = document.querySelector(".floating-nav");
const homeSection = document.querySelector("#home");

let roomProgress = 0;
const NAV_REVEAL_START = 0.72;
const NAV_REVEAL_END = 0.82;

const syncNavUI = () => {
  if (!navbar || !homeSection || !floatingNav) return;

  const homeBottom = homeSection.getBoundingClientRect().bottom;
  const leftHome = homeBottom <= 100;

  // After leaving the home/room section: hide top navbar, show floating sidebar.
  if (leftHome) {
    floatingNav.classList.add("show");

    // Mutual exclusive nav: (navbar, sidebar) = (0, 1)
    navbar.classList.add("hide");
    navbar.classList.remove("reveal-sync", "scroll-up", "scroll-down");
    navbar.style.removeProperty("--navbar-reveal");
    return;
  }

  // While the parallax home is on screen:
  // - Start hidden
  // - Reveal near the end of the parallax (scroll-synced)
  floatingNav.classList.remove("show");

  const revealT = (roomProgress - NAV_REVEAL_START) / (NAV_REVEAL_END - NAV_REVEAL_START);
  const reveal = Math.min(1, Math.max(0, revealT));

  if (reveal <= 0) {
    navbar.classList.add("hide");
    navbar.classList.remove("reveal-sync", "scroll-up", "scroll-down");
    navbar.style.removeProperty("--navbar-reveal");
    return;
  }

  navbar.classList.remove("hide");
  // Disable transitions while scroll-syncing so it doesn't lag behind.
  navbar.classList.add("reveal-sync");
  navbar.style.setProperty("--navbar-reveal", reveal.toFixed(3));
  
};

// Run once on load to ensure the starting state is correct.
syncNavUI();


// 
// PARALLAX ROOM (Section 1)
// 

const room = document.querySelector("#home.room");
const logo = document.querySelector(".JustifiLogo");
let logoOffset = 0;

// Hold the last parallax frame for a bit so the end doesn't feel like it keeps sliding.
// 0.18 means: final ~18% of the room's scroll is a "pause" at progress=1.
const END_HOLD_FRACTION = 0.18;

function scrollToParallaxProgress(targetProgress) {
  if (!room) return;

  const rect = room.getBoundingClientRect();
  const viewH = window.innerHeight;
  const totalScrollable = Math.max(1, room.offsetHeight - viewH);

  const holdPx = totalScrollable * END_HOLD_FRACTION;
  const motionScrollable = Math.max(1, totalScrollable - holdPx);

  const p = Math.min(1, Math.max(0, Number(targetProgress) || 0));
  const targetScrolled = motionScrollable * p;
  const roomTopY = rect.top + window.scrollY;

  window.scrollTo({
    top: roomTopY + targetScrolled,
    behavior: "smooth",
  });
}

// Treat "Home" as the middle of the parallax.
document.querySelectorAll('a[href="#home"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    if (!room) return;
    e.preventDefault();
    scrollToParallaxProgress(1);
  });
});

if (room) {
  let roomTicking = false;

  const updateRoomProgress = () => {
    roomTicking = false;

    const rect = room.getBoundingClientRect();
    const viewH = window.innerHeight;
    const totalScrollable = Math.max(1, room.offsetHeight - viewH);
    const scrolled = Math.min(Math.max(-rect.top, 0), totalScrollable);

    const holdPx = totalScrollable * END_HOLD_FRACTION;
    const motionScrollable = Math.max(1, totalScrollable - holdPx);
    const progress = scrolled >= motionScrollable ? 1 : scrolled / motionScrollable;

    roomProgress = progress;
    room.style.setProperty("--room-progress", progress.toFixed(4));
    syncNavUI();
  };

  const requestRoomUpdate = () => {
    if (roomTicking) return;
    roomTicking = true;
    window.requestAnimationFrame(updateRoomProgress);
  };

  window.addEventListener("scroll", requestRoomUpdate, { passive: true });
  window.addEventListener("resize", requestRoomUpdate);

  // Initial value
  requestRoomUpdate();
}

const transitionSection = document.querySelector(".parallax-transition");

window.addEventListener("scroll", () => {
  if (!transitionSection) return;

  const rect = transitionSection.getBoundingClientRect();

  if (rect.top < window.innerHeight - 100) {
    transitionSection.classList.add("show");
  }
});

const navUser = document.getElementById("nav-user");
const navLoginFloating = document.getElementById("floating-auth");
const fb = window.JustifiFirebase;

async function updateNavbarUserLink(user) {
  if (!navUser) return;

  if (user) {
    const label = (fb && fb.getDisplayName ? fb.getDisplayName(user) : (user.firstName || user.email || 'User'));
    const href = fb && fb.getDashboardPath ? fb.getDashboardPath(user, '') : 'Login/auth.html';
    navUser.textContent = label;
    navUser.href = href;
    if (navLoginFloating) {
      navLoginFloating.href = href;
      navLoginFloating.setAttribute('aria-label', 'Account');
      const labelEl = navLoginFloating.querySelector('.floating-auth-label');
      if (labelEl) labelEl.textContent = 'ACCOUNT';
    }
  } else {
    navUser.textContent = 'Login';
    navUser.href = 'Login/auth.html';
    if (navLoginFloating) {
      navLoginFloating.href = 'Login/auth.html';
      navLoginFloating.setAttribute('aria-label', 'Login');
      const labelEl = navLoginFloating.querySelector('.floating-auth-label');
      if (labelEl) labelEl.textContent = 'LOGIN';
    }
  }
}

if (fb && fb.onAuthStateChanged) {
  fb.onAuthStateChanged(updateNavbarUserLink);
} else {
  const currentUser = window.JustifiStore ? window.JustifiStore.getCurrentUser() : null;
  updateNavbarUserLink(currentUser);
}

document.addEventListener("DOMContentLoaded", async () => {
  await bindAuthNavigationLinks();
});

async function bindAuthNavigationLinks() {
  try {
    const fb = window.JustifiFirebase;
    const appStore = window.JustifiStore;

    let user = null;

    if (fb && fb.isConfigured && fb.isConfigured()) {
      user = await fb.getCurrentUser();

      if (!user && window.firebase && firebase.auth) {
        user = await new Promise((resolve) => {
          const unsubscribe = firebase.auth().onAuthStateChanged(async () => {
            unsubscribe();
            try {
              const mappedUser = await fb.getCurrentUser();
              resolve(mappedUser);
            } catch (error) {
              console.error("Failed to restore homepage auth user:", error);
              resolve(null);
            }
          });
        });
      }
    } else if (appStore) {
      user = appStore.getCurrentUser();
    }

    const navUserLink = document.getElementById("nav-user");
    const floatingLoginLink = document.getElementById("floating-auth");

    if (!navUserLink) return;

    if (user) {
      const displayName =
        (fb && fb.getDisplayName ? fb.getDisplayName(user) : null) ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.email ||
        "My Account";

      const dashboardPath =
        (fb && fb.getDashboardPath ? fb.getDashboardPath(user, "") : null) ||
        (appStore && appStore.getDashboardPath ? appStore.getDashboardPath(user, "") : "Login/auth.html");

      navUserLink.textContent = displayName;
      navUserLink.href = dashboardPath;

      if (floatingLoginLink) {
        floatingLoginLink.href = dashboardPath;
        floatingLoginLink.setAttribute('aria-label', 'Account');
        const labelEl = floatingLoginLink.querySelector('.floating-auth-label');
        if (labelEl) labelEl.textContent = 'ACCOUNT';
      }
    } else {
      navUserLink.textContent = "Login";
      navUserLink.href = "Login/auth.html";

      if (floatingLoginLink) {
        floatingLoginLink.href = "Login/auth.html";
        floatingLoginLink.setAttribute('aria-label', 'Login');
        const labelEl = floatingLoginLink.querySelector('.floating-auth-label');
        if (labelEl) labelEl.textContent = 'LOGIN';
      }
    }
  } catch (error) {
    console.error("Failed to bind auth navigation links:", error);
  }
}