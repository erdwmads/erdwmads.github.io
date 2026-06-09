(function () {
  const root = document.documentElement;
  const IDLE_MS = 25000;
  const LOW_POWER_MEDIA = [
    "(prefers-reduced-motion: reduce)",
    "(max-width: 760px)",
    "(pointer: coarse)"
  ];

  let idleTimer = 0;
  let isIdle = false;
  let isHidden = document.hidden;

  const mediaQueries = LOW_POWER_MEDIA
    .filter(function () { return !!window.matchMedia; })
    .map(function (query) { return window.matchMedia(query); });

  function getBody() {
    return document.body || null;
  }

  function mediaLowPower() {
    return mediaQueries.some(function (mq) { return mq.matches; });
  }

  function publish() {
    const body = getBody();
    const lowPower = mediaLowPower();
    const state = {
      hidden: isHidden,
      idle: isIdle,
      lowPower: lowPower,
      mobile: mediaQueries.slice(1).some(function (mq) { return mq.matches; })
    };

    window.__madsPowerState = state;

    root.classList.toggle("mads-page-hidden", state.hidden);
    root.classList.toggle("mads-power-idle", state.idle);
    root.classList.toggle("mads-power-low", state.lowPower);
    root.classList.toggle("mads-power-mobile", state.mobile);

    if (body) {
      body.classList.toggle("mads-page-hidden", state.hidden);
      body.classList.toggle("mads-power-idle", state.idle);
      body.classList.toggle("mads-power-low", state.lowPower);
      body.classList.toggle("mads-power-mobile", state.mobile);
    }

    window.dispatchEvent(new CustomEvent("mads:power-state", { detail: state }));
  }

  function enterIdle() {
    isIdle = true;
    publish();
  }

  function scheduleIdle() {
    window.clearTimeout(idleTimer);
    if (isHidden) return;
    idleTimer = window.setTimeout(enterIdle, IDLE_MS);
  }

  function markActive() {
    if (isIdle) {
      isIdle = false;
      publish();
    }
    scheduleIdle();
  }

  function handleVisibility() {
    isHidden = document.hidden;
    if (isHidden) {
      window.clearTimeout(idleTimer);
      isIdle = true;
    } else {
      isIdle = false;
      scheduleIdle();
    }
    publish();
  }

  const activityEvents = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
  activityEvents.forEach(function (eventName) {
    window.addEventListener(eventName, markActive, { passive: true });
  });

  document.addEventListener("visibilitychange", handleVisibility, { passive: true });
  window.addEventListener("pagehide", function () {
    isHidden = true;
    isIdle = true;
    window.clearTimeout(idleTimer);
    publish();
  }, { passive: true });
  window.addEventListener("pageshow", function () {
    isHidden = document.hidden;
    isIdle = false;
    scheduleIdle();
    publish();
  }, { passive: true });

  mediaQueries.forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener("change", publish);
    else if (mq.addListener) mq.addListener(publish);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", publish, { once: true });
  }

  scheduleIdle();
  publish();
})();
