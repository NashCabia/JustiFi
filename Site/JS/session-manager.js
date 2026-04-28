(function () {
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

  let timeout;

  function resetTimer() {
    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      try {
        if (window.JustifiFirebase && window.JustifiFirebase.isConfigured()) {
          await window.JustifiFirebase.logout();
        }

        alert("Session expired due to inactivity.");
        try { sessionStorage.setItem("justifi_force_logout", "1"); } catch (_) {}
        window.location.href = "../../../Login/auth.html?logout=1";
      } catch (error) {
        console.error("Auto logout failed:", error);
      }
    }, INACTIVITY_LIMIT);
  }

  function start() {
    const events = ["click", "mousemove", "keydown", "scroll"];

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();
  }

  window.SessionManager = {
    start
  };
})();