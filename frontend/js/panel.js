/* Field Shift — panel del campo: pide la recomendación y la dibuja. */
(function () {
  const t = (k) => FSI18N.t(k);
  let data = null;
  let rainChart = null;

  const RISK_COLOR = { low: "#2e9e5b", moderate: "#e8870c", high: "#d64545" };

  async function load() {
    const payload = FSStore.buildPayload();
    try {
      const res = await FSApi.getRecommendation(payload);
      data = res.data;
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("content").classList.remove("hidden");
      if (res.offline || data._mock) {
        document.getElementById("mock-flag").classList.remove("hidden");
      }
      render();
    } catch (e) {
      document.getElementById("loading").innerHTML =
        '<p class="text-red-600">No se pudo obtener la recomendación. ¿Está el servidor encendido?</p>';
    }
  }

  function gauge(score, color) {
    const r = 62, c = 2 * Math.PI * r;
    const off = c * (1 - score / 100);
    return `
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="${r}" fill="none" stroke="#ecefea" stroke-width="12"/>
        <circle cx="75" cy="75" r="${r}" fill="none" stroke="${color}" stroke-width="12"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
      </svg>
      <div class="value"><span style="font-size:28px;color:${color}">${score}</span><span style="font-size:11px;color:#8a978d">/ 100</span></div>`;
  }

  function render() {
    const color = RISK_COLOR[data.risk_level] || "#e8870c";

    // Riesgo
    document.getElementById("gauge").innerHTML = gauge(data.risk_score, color);
    const rl = document.getElementById("risk-label");
    rl.textContent = t("risk." + data.risk_level);
    rl.style.color = color;
    document.getElementById("risk-score").textContent = data.risk_score + " / 100";

    // Agua
    const wb = data.water_budget;
    const statusEl = document.getElementById("water-status");
    statusEl.textContent = t("water." + wb.status);
    statusEl.className = "text-sm font-semibold rounded-full px-3 py-1 " +
      (wb.status === "enough_water" ? "risk-low-soft"
        : wb.status === "risky" ? "risk-moderate-soft" : "risk-high-soft");
    const cov = wb.coverage_pct != null ? wb.coverage_pct
      : Math.round(100 * wb.available_water_mm / wb.crop_water_need_mm);
    document.getElementById("water-bar").style.width = Math.min(100, cov) + "%";
    document.getElementById("w-need").textContent = wb.crop_water_need_mm + " mm";
    document.getElementById("w-avail").textContent = wb.available_water_mm + " mm";
    document.getElementById("w-deficit").textContent = wb.deficit_mm + " mm";
    document.getElementById("w-explain").textContent = wb.explanation || "";

    // Siembra
    const pt = data.planting_timeline;
    const preco = document.getElementById("plant-reco");
    preco.textContent = t("plant." + pt.recommendation);
    preco.style.color = pt.recommendation === "plant_now" ? RISK_COLOR.low
      : pt.recommendation === "wait" ? RISK_COLOR.moderate : RISK_COLOR.high;
    document.getElementById("plant-window").textContent = pt.best_window || "—";
    document.getElementById("plant-reason").textContent = pt.reason || "";

    // Indicadores
    const ind = data.nasa_indicators;
    const cells = [
      ["ind.rainfall", ind.rainfall_60d_mm + " mm"],
      ["ind.rainfall_normal", ind.rainfall_normal_mm + " mm"],
      ["ind.soil_moisture", ind.soil_moisture],
      ["ind.ndvi", ind.ndvi_trend],
      ["ind.solar", ind.solar_radiation + " MJ/m²"],
      ["ind.et", ind.evapotranspiration + " mm/d"],
    ];
    document.getElementById("indicators").innerHTML = cells.map(([k, v]) =>
      `<div class="bg-gray-50 rounded-xl p-2"><p class="text-gray-500">${t(k)}</p><p class="font-bold">${v}</p></div>`
    ).join("");

    // Gráfico lluvia
    const ctx = document.getElementById("rain-chart");
    if (rainChart) rainChart.destroy();
    rainChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [t("ind.rainfall"), t("ind.rainfall_normal")],
        datasets: [{
          data: [ind.rainfall_60d_mm, ind.rainfall_normal_mm],
          backgroundColor: ["#2f80ed", "#9db7d6"],
          borderRadius: 8,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "mm" } } },
      },
    });

    // Rotaciones
    document.getElementById("rotations").innerHTML = data.rotations.map((r, i) => {
      const badge = r.risk === "low" ? "risk-low-soft" : r.risk === "moderate" ? "risk-moderate-soft" : "risk-high-soft";
      const medal = i === 0 ? "⭐" : "";
      return `<div class="fs-card p-4">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">${medal} ${t("rot." + r.type)}</span>
          <span class="text-xs rounded-full px-2 py-0.5 ${badge}">${t("risk." + r.risk)}</span>
        </div>
        <p class="font-bold">${r.name}</p>
        <p class="text-sm text-gray-600 mt-1">${r.reason}</p>
      </div>`;
    }).join("");

    // Explicación IA
    document.getElementById("ai-explain").textContent = data.ai_explanation || "";
  }

  document.addEventListener("fs:langchange", () => { if (data) render(); });
  load();
})();
