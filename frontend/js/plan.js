/* Field Shift — plan de culture (rapport détaillé). */
(function () {
  const t = (k) => FSI18N.t(k);
  const $ = (id) => document.getElementById(id);
  const charts = {};
  const PLANT = { plant_now: "#3F9D22", wait: "#E5A12A", switch_crop: "#D6462B" };
  const LVL_BADGE = { low: "badge-green", moderate: "badge-amber", high: "badge-red" };

  function render(d, res) {
    const f = FSStore.getField() || {};
    $("plan-sub").textContent = `${FSUI.cropLabel()}${f.area_ha ? " · " + f.area_ha + " ha" : ""} · ${f.latitude}, ${f.longitude}`;
    FSUI.stamp($("plan-stamp"), res, d);

    // Quand semer
    const pt = d.planting_timeline;
    $("plant-reco").textContent = t("plant." + pt.recommendation);
    $("plant-reco").style.color = PLANT[pt.recommendation] || "";
    $("plant-window").textContent = FSUI.fmtWindow(pt.best_window);
    $("plant-reason").textContent = pt.reason || "";
    const steps = [
      { k: "plant.step_wait", i: "solar:clock-circle-bold", on: pt.recommendation === "wait" },
      { k: "plant.step_plant", i: "mdi:sprout", on: pt.recommendation === "plant_now" },
      { k: "plant.step_risk", i: "solar:danger-triangle-bold", on: pt.recommendation === "switch_crop" },
    ];
    $("steps").innerHTML = steps.map((s) =>
      `<div><div class="st-ico${s.on ? " on" : ""}">${FSUI.icon(s.i, 24)}</div><p class="small bold">${t(s.k)}</p></div>`).join("");

    // Budget d'eau
    const wb = d.water_budget;
    const ws = $("water-status");
    ws.textContent = t("water." + wb.status);
    ws.className = "badge " + ({ enough_water: "badge-green", risky: "badge-amber", not_enough_water: "badge-red" }[wb.status] || "badge-gray");
    $("w-avail").textContent = wb.available_water_mm + " mm";
    $("w-need").textContent = wb.crop_water_need_mm + " mm";
    $("w-deficit").textContent = wb.deficit_mm + " mm";
    const cov = wb.coverage_pct != null ? wb.coverage_pct : Math.round((100 * wb.available_water_mm) / wb.crop_water_need_mm);
    const bar = $("water-bar");
    bar.style.width = Math.min(100, cov) + "%";
    bar.style.background = cov >= 100 ? "#3F9D22" : cov >= 65 ? "#E5A12A" : "#D6462B";
    $("w-explain").textContent = wb.explanation || "";

    // Pourquoi ce risque
    const rb = $("risk-badge");
    rb.textContent = `${t("risk." + d.risk_level)} · ${d.risk_score}/100`;
    rb.className = "badge " + LVL_BADGE[d.risk_level];
    const ICON = { rainfall: "solar:cloud-rain-linear", soil_moisture: "solar:waterdrops-linear", ndvi: "solar:leaf-linear", heat: "solar:sun-2-linear" };
    $("risk-why").innerHTML = (d.risk_components || []).map((c) => `
      <div class="why-row">
        <span class="why-ico c-${c.level}">${FSUI.icon(ICON[c.factor] || "solar:info-circle-linear", 22)}</span>
        <div><p class="bold">${t("rc." + c.factor)}</p><p class="small c-${c.level}">${c.value}</p></div>
        <div class="xs faint" style="text-align:right">${c.source}<br>${t("rc.weight")} ${c.weight}</div>
      </div>`).join("");

    // Rotations
    $("rotations").innerHTML = d.rotations.map((r, i) => `
      <article class="rot${i === 0 ? " reco" : ""}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="badge ${i === 0 ? "badge-dark" : "badge-gray"}">${i === 0 ? "★ " : ""}${t("rot." + r.type)}</span>
          <span class="badge ${LVL_BADGE[r.risk] || "badge-gray"}">${t("risk." + r.risk)}</span>
        </div>
        <h3>${r.name}</h3>
        <p class="small muted" style="margin-top:4px">${r.reason}</p>
      </article>`).join("");

    $("ai-explain").textContent = d.ai_explanation || "";

    // Indicateurs NASA
    const ind = d.nasa_indicators;
    const cells = [
      ["ind.rainfall", ind.rainfall_60d_mm + " mm"], ["ind.rainfall_normal", ind.rainfall_normal_mm + " mm"],
      ["ind.soil_moisture", ind.soil_moisture + " m³/m³"], ["ind.ndvi", ind.ndvi_trend],
      ["ind.solar", ind.solar_radiation + " MJ/m²"], ["ind.et", ind.evapotranspiration + " mm/j"],
    ];
    $("indicators").innerHTML = cells.map(([k, v]) =>
      `<div class="wb-box"><p class="xs muted">${t(k)}</p><p class="bold" style="margin-top:6px">${v}</p></div>`).join("");
    drawCharts(d);

    if (location.hash === "#why") setTimeout(() => $("why").scrollIntoView({ behavior: "smooth" }), 300);
  }

  function mk(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($(id), cfg); }
  function base(y) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: "#EFEFEA" }, border: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 5 }, title: { display: !!y, text: y } },
      },
    };
  }
  function drawCharts(d) {
    const s = d.series;
    if (!s) return;
    mk("rain-chart", { type: "bar", data: { labels: s.labels, datasets: [
      { type: "bar", label: t("ind.rainfall"), data: s.rainfall_mm, backgroundColor: "#D2EBC4", hoverBackgroundColor: "#3F9D22", borderRadius: 8, maxBarThickness: 26 },
      { type: "line", label: t("chart.normal"), data: s.rainfall_normal_mm, borderColor: "#3F9D22", borderDash: [5, 4], pointRadius: 0, borderWidth: 2 },
    ] }, options: base("mm") });
    mk("soil-chart", { type: "line", data: { labels: s.labels, datasets: [
      { data: s.soil_moisture, borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,.10)", fill: true, tension: 0.35, pointRadius: 2 },
    ] }, options: base("m³/m³") });
    mk("ndvi-chart", { type: "line", data: { labels: s.labels, datasets: [
      { data: s.ndvi, borderColor: "#3F9D22", backgroundColor: "rgba(63,157,34,.12)", fill: true, tension: 0.35, pointRadius: 2 },
    ] }, options: base("NDVI") });
    const o = base("°C");
    o.plugins.legend = { display: true, labels: { boxWidth: 10, font: { size: 10 } } };
    o.scales.y1 = { position: "right", grid: { drawOnChartArea: false }, border: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 5 }, title: { display: true, text: "MJ/m²" } };
    mk("climate-chart", { type: "line", data: { labels: s.labels, datasets: [
      { label: t("chart.temp"), data: s.temperature_c, borderColor: "#D6462B", tension: 0.35, pointRadius: 2, yAxisID: "y" },
      { label: t("chart.solar"), data: s.solar_radiation, borderColor: "#E5A12A", tension: 0.35, pointRadius: 2, yAxisID: "y1" },
    ] }, options: o });
  }

  FSUI.dataPage(render);
})();
