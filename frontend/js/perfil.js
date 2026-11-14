/* Field Shift — profil de l'agriculteur (sélection par boutons). */
(function () {
  const state = { crop: "maize", irrigation: false };
  const saved = FSStore.getProfile();
  const soil = document.getElementById("soil");
  const priority = document.getElementById("priority");

  if (saved) {
    state.crop = saved.crop || "maize";
    state.irrigation = !!saved.irrigation;
    if (saved.soil_type) soil.value = saved.soil_type;
    if (saved.priority) priority.value = saved.priority;
  }

  const cropBtns = Array.from(document.querySelectorAll(".crop-btn"));
  const irrBtns = Array.from(document.querySelectorAll(".irr-btn"));

  // N'utilise que des classes déjà présentes à l'écran (compilées par Tailwind).
  function setActive(btn, on) {
    btn.classList.toggle("bg-primary", on);
    btn.classList.toggle("text-primary-foreground", on);
    btn.classList.toggle("bg-card", !on);
  }
  function paint() {
    cropBtns.forEach((b) => setActive(b, b.dataset.crop === state.crop));
    irrBtns.forEach((b) => setActive(b, (b.dataset.irr === "true") === state.irrigation));
  }

  cropBtns.forEach((b) => b.addEventListener("click", () => { state.crop = b.dataset.crop; paint(); }));
  irrBtns.forEach((b) => b.addEventListener("click", () => { state.irrigation = b.dataset.irr === "true"; paint(); }));
  paint();

  document.getElementById("submit-btn").addEventListener("click", () => {
    FSStore.setProfile({
      crop: state.crop,
      soil_type: soil.value,
      irrigation: state.irrigation,
      priority: priority.value,
    });
    window.location.href = "/panel.html";
  });
})();
