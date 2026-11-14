/* Field Shift — tarjeta de cooperativa (resumen imprimible + QR). */
(function () {
  const t = (k) => FSI18N.t(k);
  const RISK_COLOR = { low: "#2e9e5b", moderate: "#e8870c", high: "#d64545" };

  function render() {
    const reco = FSStore.getLastReco();
    const field = FSStore.getField();

    document.getElementById("c-coords").textContent =
      field ? `${field.latitude}, ${field.longitude}` : "—";

    if (!reco) {
      document.getElementById("card").insertAdjacentHTML("afterbegin",
        `<p class="text-sm text-red-600 mb-2">${FSI18N.lang === "en"
          ? "No recommendation yet. Open the Panel first." : "Aún no hay recomendación. Abre el Panel primero."}</p>`);
      return;
    }

    const riskEl = document.getElementById("c-risk");
    riskEl.textContent = t("risk." + reco.risk_level) + " (" + reco.risk_score + ")";
    riskEl.style.background = RISK_COLOR[reco.risk_level];

    const wb = reco.water_budget;
    document.getElementById("c-water").textContent =
      `${t("water." + wb.status)} — ${wb.available_water_mm}/${wb.crop_water_need_mm} mm`;

    document.getElementById("c-rotation").textContent = reco.rotations[0] ? reco.rotations[0].name : "—";

    const pt = reco.planting_timeline;
    document.getElementById("c-planting").textContent =
      `${t("plant." + pt.recommendation)} · ${pt.best_window || ""}`;

    const actions = {
      plant_now: FSI18N.lang === "en" ? "Prepare soil and seed within the window."
        : "Preparar el suelo y sembrar dentro de la ventana.",
      wait: FSI18N.lang === "en" ? "Wait for rain; conserve soil moisture."
        : "Esperar la lluvia; conservar la humedad del suelo.",
      switch_crop: FSI18N.lang === "en" ? "Choose a drought-tolerant crop or rotation."
        : "Elegir un cultivo o rotación más resistente a la sequía.",
    };
    document.getElementById("c-actions").textContent = actions[pt.recommendation] || "";

    // QR hacia la PWA
    const qr = document.getElementById("qr");
    qr.innerHTML = "";
    if (window.QRCode) {
      new QRCode(qr, { text: window.location.origin, width: 72, height: 72 });
    }
  }

  document.addEventListener("fs:langchange", () => {
    document.getElementById("qr").innerHTML = "";
    render();
  });
  render();
})();
