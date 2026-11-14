/* Field Shift — panel : demande la recommandation et la dessine (design v2). */
(function () {
  // Garde-fou : pas de parcelle choisie → on renvoie vers la carte.
  if (!FSStore.getField()) { window.location.replace("/campo.html"); return; }
  const t = (k) => FSI18N.t(k);
  let data = null;
  const charts = {};

  // Palette du thème (risque).
  const RISK_COLOR = { low: "#16A34A", moderate: "#F59E0B", high: "#DC2626" };

  function stamp(offline, mock) {
    const time = new Date().toLocaleTimeString(
      FSI18N.lang === "en" ? "en-US" : FSI18N.lang === "it" ? "it-IT" : "fr-FR",
      { hour: "2-digit", minute: "2-digit" });
    const flag = document.getElementById("mock-flag");
    flag.classList.remove("hidden");
    let html = `<span class="text-xs text-muted-foreground">${t("panel.updated")} ${time}</span>`;
    if (offline) html += ` · <span class="mock-chip">📴 ${t("panel.offline")}</span>`;
    else if (mock) html += ` · <span class="mock-chip">⚙️ ${t("panel.mock")}</span>`;
    flag.innerHTML = html;
  }

  function showError() {
    document.getElementById("loading").innerHTML =
      `<p class="text-destructive mb-3">${t("panel.error")}</p>
       <button onclick="location.reload()" class="h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold">${t("panel.retry")}</button>`;
  }

  async function load() {
    try {
      const res = await FSApi.getRecommendation(FSStore.buildPayload());
      data = res.data;
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("content").classList.remove("hidden");
      stamp(res.offline, data._mock);
      render();
    } catch (e) {
      showError();
    }
  }

  function gauge(score, color) {
    const r = 58, c = 2 * Math.PI * r;
    const off = c * (1 - score / 100);
    return `
      <svg width="140" height="140" viewBox="0 0 140 140" style="transform:rotate(-90deg)">
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="12"/>
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="12"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <span style="font-family:Manrope,sans-serif;font-size:30px;font-weight:800;color:${color}">${score}</span>
        <span style="font-size:11px;color:#64748B">/ 100</span>
      </div>`;
  }

  function render() {
    const color = RISK_COLOR[data.risk_level] || RISK_COLOR.moderate;

    // Risque
    document.getElementById("gauge").innerHTML = gauge(data.risk_score, color);
    const rl = document.getElementById("risk-label");
    rl.textContent = t("risk." + data.risk_level);
    rl.style.color = color;
    document.getElementById("risk-score").textContent = data.risk_score + " / 100";

    // Pourquoi ce risque (composantes)
    const whyEl = document.getElementById("risk-why");
    if (whyEl) {
      const ICON = { rainfall: "solar:cloud-rain-linear", soil_moisture: "solar:water-linear", ndvi: "solar:leaf-linear", heat: "solar:danger-triangle-linear" };
      const LVL = { ok: "text-chart-4", warn: "text-accent-foreground", bad: "text-destructive" };
      whyEl.innerHTML = (data.risk_components || []).map((c) => `
        <div class="flex items-center gap-4">
          <div class="size-12 rounded-2xl bg-muted/60 flex items-center justify-center shrink-0 ${LVL[c.level] || ""}">
            <iconify-icon icon="${ICON[c.factor] || "solar:info-circle-linear"}" width="24" height="24"></iconify-icon>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-base">${t("rc." + c.factor)}</p>
            <p class="text-sm font-medium ${LVL[c.level] || ""}">${c.value}</p>
          </div>
          <div class="text-right text-xs text-muted-foreground">${c.source}<br>${t("rc.weight")} ${c.weight}</div>
        </div>`).join("");
    }

    // Budget d'eau
    const wb = data.water_budget;
    const statusEl = document.getElementById("water-status");
    statusEl.textContent = t("water." + wb.status);
    statusEl.className = "rounded-full px-3 py-1 text-sm font-semibold " +
      (wb.status === "enough_water" ? "risk-low-soft"
        : wb.status === "risky" ? "risk-moderate-soft" : "risk-high-soft");
    const cov = wb.coverage_pct != null ? wb.coverage_pct
      : Math.round(100 * wb.available_water_mm / wb.crop_water_need_mm);
    document.getElementById("water-bar").style.width = Math.min(100, cov) + "%";
    document.getElementById("w-avail").textContent = wb.available_water_mm + " mm";
    document.getElementById("w-need").textContent = wb.crop_water_need_mm + " mm";
    document.getElementById("w-deficit").textContent = wb.deficit_mm + " mm";
    document.getElementById("w-explain").textContent = wb.explanation || "";

    // Quand semer
    const pt = data.planting_timeline;
    const preco = document.getElementById("plant-reco");
    preco.textContent = t("plant." + pt.recommendation);
    preco.style.color = pt.recommendation === "plant_now" ? RISK_COLOR.low
      : pt.recommendation === "wait" ? RISK_COLOR.moderate : RISK_COLOR.high;
    document.getElementById("plant-window").textContent = pt.best_window || "—";
    document.getElementById("plant-reason").textContent = pt.reason || "";

    // Indicateurs (grille)
    const ind = data.nasa_indicators;
    const cells = [
      ["ind.rainfall", ind.rainfall_60d_mm + " mm"],
      ["ind.rainfall_normal", ind.rainfall_normal_mm + " mm"],
      ["ind.soil_moisture", ind.soil_moisture],
      ["ind.ndvi", ind.ndvi_trend],
      ["ind.solar", ind.solar_radiation + " MJ/m²"],
      ["ind.et", ind.evapotranspiration + " mm/j"],
    ];
    document.getElementById("indicators").innerHTML = cells.map(([k, v]) =>
      `<div class="bg-muted/60 rounded-xl p-2"><p class="text-muted-foreground">${t(k)}</p><p class="font-bold">${v}</p></div>`
    ).join("");

    drawCharts();

    // Rotations (cartes façon design)
    document.getElementById("rotations").innerHTML = data.rotations.map((r, i) => {
      const recommended = i === 0;
      const border = recommended ? "border-2 border-secondary" : "border border-border";
      const badge = recommended ? "bg-secondary text-secondary-foreground"
        : r.type === "highest_yield" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary";
      const riskCls = r.risk === "low" ? "text-chart-4" : r.risk === "high" ? "text-destructive" : "text-accent-foreground";
      return `<article class="rounded-3xl bg-card ${border} p-5">
        <div class="flex items-center justify-between">
          <span class="rounded-full ${badge} px-3 py-1 text-sm font-semibold">${t("rot." + r.type)}</span>
          <span class="text-sm font-semibold ${riskCls}">${t("risk." + r.risk)}</span>
        </div>
        <h3 class="mt-3 font-heading text-xl font-bold">${r.name}</h3>
        <p class="mt-1 text-base text-muted-foreground">${r.reason}</p>
      </article>`;
    }).join("");

    // Explication
    document.getElementById("ai-explain").textContent = data.ai_explanation || "";
  }

  // --- Graphiques -----------------------------------------------------
  function mkChart(id, cfg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(el, cfg);
  }
  function baseOpts(yTitle) {
    return {
      plugins: { legend: { display: true, labels: { boxWidth: 12, font: { size: 10 } } } },
      scales: { y: { beginAtZero: false, title: { display: true, text: yTitle } } },
      elements: { line: { borderWidth: 2 } },
    };
  }
  function drawCharts() {
    const s = data.series;
    const ind = data.nasa_indicators;
    const area = (label, arr, color, fill) => ({
      label, data: arr, borderColor: color, backgroundColor: fill || color,
      tension: .35, pointRadius: 2, fill: !!fill,
    });

    if (s && s.labels) {
      mkChart("rain-chart", {
        type: "bar",
        data: { labels: s.labels, datasets: [
          { type: "bar", label: t("ind.rainfall"), data: s.rainfall_mm, backgroundColor: "#2563EB", borderRadius: 6 },
          { type: "line", label: t("chart.normal"), data: s.rainfall_normal_mm, borderColor: "#94A3B8", borderDash: [5, 4], pointRadius: 0, tension: 0 },
        ] },
        options: baseOpts("mm"),
      });
      mkChart("soil-chart", { type: "line",
        data: { labels: s.labels, datasets: [area(t("ind.soil_moisture"), s.soil_moisture, "#2563EB", "rgba(37,99,235,.12)")] },
        options: baseOpts("m³/m³") });
      mkChart("ndvi-chart", { type: "line",
        data: { labels: s.labels, datasets: [area("NDVI", s.ndvi, "#16A34A", "rgba(22,163,74,.12)")] },
        options: baseOpts("NDVI") });
      mkChart("climate-chart", { type: "line",
        data: { labels: s.labels, datasets: [
          { label: t("chart.temp"), data: s.temperature_c, borderColor: "#DC2626", yAxisID: "y", tension: .35, pointRadius: 2 },
          { label: t("chart.solar"), data: s.solar_radiation, borderColor: "#F59E0B", yAxisID: "y1", tension: .35, pointRadius: 2 },
        ] },
        options: {
          plugins: { legend: { display: true, labels: { boxWidth: 12, font: { size: 10 } } } },
          scales: {
            y: { position: "left", title: { display: true, text: "°C" } },
            y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "MJ/m²" } },
          },
        } });
    } else {
      mkChart("rain-chart", {
        type: "bar",
        data: { labels: [t("ind.rainfall"), t("ind.rainfall_normal")],
          datasets: [{ data: [ind.rainfall_60d_mm, ind.rainfall_normal_mm], backgroundColor: ["#2563EB", "#94A3B8"], borderRadius: 8 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
      });
    }
  }

  // Au changement de langue, on recharge pour localiser aussi les textes serveur.
  document.addEventListener("fs:langchange", () => { load(); });
  load();
})();
