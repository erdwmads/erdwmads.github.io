
(function () {
  function initCoordinates() {
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
      target = "Pentax 6×7";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCoordinates);
  } else {
    initCoordinates();
  }
})();
