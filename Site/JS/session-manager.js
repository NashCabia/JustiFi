(function () {
  const DEFAULT_INACTIVITY_LIMIT = 1800 * 1000;
  const DEFAULT_WARNING_TIME = 5 * 1000;

  let started = false;
  let timeoutId = null;
  let warningTimeoutId = null;
  let warningPanel = null;
  let countdownIntervalId = null;
  let config = null;

  function getPathname() {
    return String(window.location.pathname || "").replace(/\\/g, "/");
  }

  function isDeveloperPage() {
    return /\/Profiling\/Developer\//i.test(getPathname());
  }

  function isSilentPage() {
    const path = getPathname();
    return /\/Site\/index\.html$/i.test(path) || /\/Site\/Login\/auth\.html$/i.test(path);
  }

  function resolveLogoutUrl() {
    const path = getPathname();

    if (/\/Profiling\/UserPage\/Dashboard\/dash\.html$/i.test(path)) {
      return "../../../Login/auth.html?logout=1";
    }

    if (/\/Profiling\/UserPage\/Dashboard\/(Profile\/user|Badges\/badge)\.html$/i.test(path)) {
      return "../../../../Login/auth.html?logout=1";
    }

    if (/\/Profiling\/AdminPage\/Dashboard\/Students\/Students-View\/students-view\.html$/i.test(path)) {
      return "../../../../../Login/auth.html?logout=1";
    }

    if (/\/Profiling\/AdminPage\/Dashboard\/(admindash|Profile\/admin|Students\/students|Manage\/manage-students)\.html$/i.test(path)) {
      return "../../../../Login/auth.html?logout=1";
    }

    return "../../../Login/auth.html?logout=1";
  }

  function getConfig(overrides = {}) {
    const pageOptions = window.JUSTIFI_SESSION_MANAGER_OPTIONS || {};
    const silent = isSilentPage();

    return {
      inactivityLimit: overrides.inactivityLimit ?? pageOptions.inactivityLimit ?? DEFAULT_INACTIVITY_LIMIT,
      warningTime: overrides.warningTime ?? pageOptions.warningTime ?? DEFAULT_WARNING_TIME,
      showWarning: overrides.showWarning ?? pageOptions.showWarning ?? !silent,
      redirectToLogin: overrides.redirectToLogin ?? pageOptions.redirectToLogin ?? !silent,
      logoutUrl: overrides.logoutUrl ?? pageOptions.logoutUrl ?? resolveLogoutUrl()
    };
  }

  function cleanupWarning() {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }

    if (warningPanel) {
      warningPanel.remove();
      warningPanel = null;
    }
  }

  function showSessionWarning() {
    if (!config || !config.showWarning || warningPanel) return;

    warningPanel = document.createElement("div");
    warningPanel.id = "sessionWarning";
    warningPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #350954;
      color: white;
      padding: 24px 32px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 9999;
      text-align: center;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      max-width: 400px;
    `;

    const seconds = Math.max(1, Math.ceil((config.warningTime || DEFAULT_WARNING_TIME) / 1000));
    warningPanel.innerHTML = `
      <h3 style="margin: 0 0 12px; font-size: 18px;">Session Expiring</h3>
      <p style="margin: 0 0 16px; font-size: 14px;">Your session will expire in <strong id="warningCountdown">${seconds}</strong> seconds due to inactivity.</p>
      <button id="extendSession" style="
        padding: 10px 20px;
        background: white;
        color: #2b0643;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        margin-right: 8px;
      ">Stay Logged In</button>
    `;

    document.body.appendChild(warningPanel);

    let countdown = seconds;
    countdownIntervalId = setInterval(() => {
      countdown -= 1;
      const countdownEl = document.getElementById("warningCountdown");
      if (countdownEl) countdownEl.textContent = String(Math.max(0, countdown));
      if (countdown <= 0 && countdownIntervalId) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
      }
    }, 1000);

    const extendBtn = document.getElementById("extendSession");
    if (extendBtn) {
      extendBtn.addEventListener("click", () => {
        resetTimer();
      });
    }
  }

  function resetTimer() {
    if (!started) return;

    clearTimeout(timeoutId);
    clearTimeout(warningTimeoutId);
    cleanupWarning();

    if (config.showWarning && config.warningTime < config.inactivityLimit) {
      warningTimeoutId = setTimeout(showSessionWarning, config.inactivityLimit - config.warningTime);
    }

    timeoutId = setTimeout(async () => {
      try {
        if (window.JustifiFirebase && window.JustifiFirebase.isConfigured && window.JustifiFirebase.isConfigured()) {
          await window.JustifiFirebase.logout();
        } else if (window.JustifiStore && typeof window.JustifiStore.clearCurrentUser === "function") {
          window.JustifiStore.clearCurrentUser();
        }

        try {
          sessionStorage.setItem("justifi_force_logout", "1");
        } catch (_) {}

        if (config.redirectToLogin) {
          window.location.href = config.logoutUrl;
        } else {
          window.dispatchEvent(new Event("justifi:session-expired"));
        }
      } catch (error) {
        console.error("Auto logout failed:", error);
      }
    }, config.inactivityLimit);
  }

  function start(overrides = {}) {
    if (started || isDeveloperPage()) return;

    started = true;
    config = getConfig(overrides);

    const events = ["click", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));

    resetTimer();
  }

  function stop() {
    clearTimeout(timeoutId);
    clearTimeout(warningTimeoutId);
    cleanupWarning();
    started = false;
  }

  window.SessionManager = {
    start,
    stop,
    isStarted: () => started
  };

  if (!window.JUSTIFI_SESSION_MANAGER_DISABLED && !isDeveloperPage()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => start(), { once: true });
    } else {
      start();
    }
  }
})();