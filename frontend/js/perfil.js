/* Field Shift — profil de l'agriculteur. */
(function () {
  const state = { crop: "maize", irrigation: false, priority: "balanced" };
  const saved = FSStore.getProfile();
  const soil = document.getElementById("soil");
  if (saved) {
    state.crop = saved.crop || "maize";
    state.irrigation = !!saved.irrigation;
    state.priority = saved.priority || "balanced";
    if (saved.soil_type) soil.value = saved.soil_type;
  }

  const groups = [
    { sel: ".crop-btn", match: (b) => b.dataset.crop === state.crop, set: (b) => { state.crop = b.dataset.crop; } },
    { sel: ".irr-btn", match: (b) => (b.dataset.irr === "true") === state.irrigation, set: (b) => { state.irrigation = b.dataset.irr === "true"; } },
    { sel: ".prio-btn", match: (b) => b.dataset.prio === state.priority, set: (b) => { state.priority = b.dataset.prio; } },
  ];
  function paint() {
    groups.forEach((g) => document.querySelectorAll(g.sel).forEach((b) => b.classList.toggle("is-active", g.match(b))));
  }
  groups.forEach((g) => document.querySelectorAll(g.sel).forEach((b) =>
    b.addEventListener("click", () => { g.set(b); paint(); })));
  paint();

  document.getElementById("submit-btn").addEventListener("click", () => {
    FSStore.setProfile({ crop: state.crop, soil_type: soil.value, irrigation: state.irrigation, priority: state.priority });
    window.location.href = FSStore.getField() ? "/panel.html" : "/campo.html";
  });
})();
