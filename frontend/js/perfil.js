/* Field Shift — formulario de perfil del agricultor. */
(function () {
  const form = document.getElementById("profile-form");
  const saved = FSStore.getProfile();

  // Rellena con lo guardado previamente.
  if (saved) {
    if (saved.crop) form.crop.value = saved.crop;
    if (saved.soil_type) form.soil_type.value = saved.soil_type;
    if (saved.priority) form.priority.value = saved.priority;
    const irr = saved.irrigation ? "yes" : "no";
    form.querySelector(`input[name=irrigation][value=${irr}]`).checked = true;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    FSStore.setProfile({
      crop: form.crop.value,
      soil_type: form.soil_type.value,
      irrigation: form.irrigation.value === "yes",
      priority: form.priority.value,
    });
    window.location.href = "/panel.html";
  });
})();
