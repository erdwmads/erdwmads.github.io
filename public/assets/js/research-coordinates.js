(function () {
  const MOBILE_COORDINATES_MEDIA = "(max-width: 760px), (pointer: coarse)";
  const mobileCoordinatesQuery = window.matchMedia
    ? window.matchMedia(MOBILE_COORDINATES_MEDIA)
    : null;

  function removeCoordinates() {
    document.querySelector(".research-coordinates")?.remove();
  }

  function initCoordinates() {
    if (mobileCoordinatesQuery?.matches) {
      removeCoordinates();
      return;
    }

    if (document.querySelector(".research-coordinates")) return;

    const isPaper = location.pathname.includes("paper-shelf");
    const isSample = location.pathname.includes("sample-cabinet");
    const isPhoto = location.pathname.includes("photography");
    const isCV = location.pathname.includes("cv");
    const isContact = location.pathname.includes("contact");

    let target = "Orgueil CI1";
    let phase = "Dolomite";
    let mode = "Research";

    if (isPaper) {
      target = "Reading Shelf";
      phase = "Carbonates / CI";
      mode = "Literature";
    } else if (isSample) {
      target = "Sample Cabinet";
      phase = "Astromaterials";
      mode = "Specimen";
    } else if (isPhoto) {
      target = "Pentax 6x7";
      phase = "Photography";
      mode = "Gallery";
    } else if (isCV) {
      target = "Waseda";
      phase = "Earth Sciences";
      mode = "CV";
    } else if (isContact) {
      target = "Academic";
      phase = "Email";
      mode = "Contact";
    }

    const panel = document.createElement("aside");
    panel.className = "research-coordinates";
    panel.setAttribute("aria-label", "Research coordinates");
    panel.innerHTML = `
      <span>Target: ${target}</span>
      <span>Phase: ${phase}</span>
      <span>Mode: ${mode}</span>
    `;
    document.body.appendChild(panel);
  }

  function syncCoordinates() {
    removeCoordinates();
    initCoordinates();
  }

  if (mobileCoordinatesQuery?.addEventListener) {
    mobileCoordinatesQuery.addEventListener("change", syncCoordinates);
  } else if (mobileCoordinatesQuery?.addListener) {
    mobileCoordinatesQuery.addListener(syncCoordinates);
  }

  window.addEventListener("mads:soft-nav-ready", syncCoordinates);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCoordinates);
  } else {
    initCoordinates();
  }
})();
