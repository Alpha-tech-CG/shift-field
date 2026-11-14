/* Field Shift — tableau de bord (maquette « serre »). */
(function () {
  const t = (k) => FSI18N.t(k);
  const $ = (id) => document.getElementById(id);
  const last = (a) => (a && a.length ? a[a.length - 1] : null);
  const PLANT_COLOR = { plant_now: "#3F9D22", wait: "#E5A12A", switch_crop: "#D6462B" };

  // Variables affichables dans « Santé du champ » (synchronisées avec les tuiles).
  const VARS = {
    temp: { key: "var.temp", unit: "°C", get: (s) => s.temperature_c },
    soil: { key: "var.soil", unit: "m³/m³", get: (s) => s.soil_moisture },
    rain: { key: "var.rain", unit: "mm", get: (s) => s.rainfall_mm },
    ndvi: { key: "var.ndvi", unit: "", get: (s) => s.ndvi },
  };
  let data = null, chart = null, selected = "rain";

  function render(d, res) {
    data = d;
    const s = d.series || {}, ind = d.nasa_indicators, pt = d.planting_timeline;
    const field = FSStore.getField() || {};
    const color = FSUI.RISK_COLOR[d.risk_level];

    // --- Bandeau photo
    $("hero-parcel").innerHTML = `${FSUI.icon("solar:map-point-bold", 16)} ${FSUI.cropLabel()}${field.area_ha ? " · " + field.area_ha + " ha" : ""} · ${field.latitude}, ${field.longitude}`;
    FSUI.stamp($("hero-stamp"), res, d);
    const hr = $("hero-reco");
    hr.textContent = t("plant." + pt.recommendation);
    hr.style.color = PLANT_COLOR[pt.recommendation] || "";
    $("hero-reason").textContent = pt.reason;

    // --- Suivi du champ
    $("mon-badge").innerHTML = `<span style="width:7px;height:7px;border-radius:9px;background:currentColor;display:inline-block"></span> ${d._mock ? t("mon.badge_demo") : "Live"}`;
    $("mon-date").textContent = FSUI.fmtDay(new Date());
    $("mon-temp").textContent = `${last(s.temperature_c)}°C`;
    $("mon-l1").innerHTML = `${FSUI.icon("solar:sun-2-bold", 14)} ${t("mon.solar")} ${ind.solar_radiation} MJ/m²`;
    $("mon-l2").textContent = `${t("mon.soil")} ${Math.round(ind.soil_moisture * 100)} %`;
    $("mon-ring").innerHTML = FSUI.ring(d.risk_score, color, 150, 12);
    $("mon-score").textContent = d.risk_score;
    $("mon-level").textContent = t("risk." + d.risk_level);
    $("mon-level").style.color = color;
    renderTiles(s, ind);

    // --- Calendrier de semis
    renderCalendar(pt);

    // --- Santé du champ
    const score = 100 - d.risk_score;
    $("ins-score").textContent = score;
    $("ins-score").style.color = score >= 60 ? "#3F9D22" : score >= 31 ? "#E5A12A" : "#D6462B";
    const pct = Math.round((100 * ind.rainfall_60d_mm) / ind.rainfall_normal_mm);
    $("ins-delta").innerHTML = `<span class="${pct < 90 ? "c-red" : "c-green"}">${pct < 100 ? "↓" : "↑"} ${pct} %</span> <span class="faint">${t("ins.vs_normal")}</span>`;
    const sel = $("ins-var");
    sel.innerHTML = Object.keys(VARS).map((k) => `<option value="${k}">${t(VARS[k].key)}</option>`).join("");
    sel.value = selected;
    sel.onchange = () => select(sel.value);
    drawChart();

    // --- Météo & eau
    renderWeather(s, ind, d.water_budget);
  }

  function renderTiles(s, ind) {
    const tiles = [
      { id: "temp", icon: "solar:temperature-linear", label: t("tile.temp"), value: `${last(s.temperature_c)}°C` },
      { id: "soil", icon: "solar:waterdrops-linear", label: t("tile.soil"), value: `${Math.round(ind.soil_moisture * 100)}%` },
      { id: "rain", icon: "solar:cloud-rain-linear", label: t("tile.rain"), value: `${ind.rainfall_60d_mm} mm` },
      { id: "ndvi", icon: "solar:leaf-linear", label: t("tile.ndvi"), value: last(s.ndvi) },
    ];
    $("mon-tiles").innerHTML = tiles.map((x) => `
      <button class="tile${x.id === selected ? " is-active" : ""}" data-var="${x.id}">
        <span class="t-label">${FSUI.icon(x.icon, 14)} ${x.label}</span>
        <span class="t-value" style="display:block">${x.value}</span>
      </button>`).join("");
    $("mon-tiles").querySelectorAll(".tile").forEach((b) => b.addEventListener("click", () => select(b.dataset.var)));
  }

  function select(id) {
    selected = id;
    $("ins-var").value = id;
    $("mon-tiles").querySelectorAll(".tile").forEach((b) => b.classList.toggle("is-active", b.dataset.var === id));
    drawChart();
  }

  function drawChart() {
    const s = data.series || {};
    const v = VARS[selected];
    const values = v.get(s) || [];
    const n = values.length;
    if (chart) chart.destroy();
    chart = new Chart($("ins-chart"), {
      type: "bar",
      data: {
        labels: s.labels || [],
        datasets: [{
          label: t(v.key), data: values,
          backgroundColor: values.map((_, i) => (i === n - 1 ? "#3F9D22" : "#D2EBC4")),
          hoverBackgroundColor: "#57B33D", borderRadius: 10, borderSkipped: false, maxBarThickness: 30,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: (c) => `${c.formattedValue} ${v.unit}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: selected === "rain", grid: { color: "#EFEFEA" }, border: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 5 } },
        },
      },
    });
  }

  function renderCalendar(pt) {
    const win = FSUI.parseWindow(pt.best_window);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const a = new Date(monday); a.setDate(monday.getDate() + i * 7);
      const b = new Date(a); b.setDate(a.getDate() + 6);
      return { a, b, on: !!(win && a <= win[1] && b >= win[0]) };
    });
    const firstOn = weeks.findIndex((w) => w.on);
    const lastOn = weeks.length - 1 - weeks.slice().reverse().findIndex((w) => w.on);
    const markerAt = firstOn >= 0 ? firstOn : 0;
    const col = PLANT_COLOR[pt.recommendation] || "#3F9D22";

    $("cal-weeks").innerHTML = weeks.map((w, i) => `<div class="wk${i === 0 ? " is-now" : ""}">${t("cal.week")}${i + 1}</div>`).join("");
    $("cal-area").innerHTML = weeks.map((w, i) => {
      const cls = w.on ? ` is-window${i === firstOn ? " first" : ""}${i === lastOn ? " last" : ""}` : "";
      const marker = i === markerAt ? `<div class="cal-marker"><span class="pill">${t("plant." + pt.recommendation)}</span>
        <div class="seed" style="color:${col}">${FSUI.icon(pt.recommendation === "switch_crop" ? "solar:danger-triangle-bold" : "mdi:sprout", 28)}</div></div>` : "";
      return `<div class="cal-col${cls}">${marker}</div>`;
    }).join("");
    $("cal-axis").innerHTML = weeks.map((w) => `<span>${FSUI.fmtShort(w.a)}</span>`).join("");
    $("cal-text").innerHTML = `<b>${t("plant.window")}</b> · ${FSUI.fmtWindow(pt.best_window)}`;
  }

  function renderWeather(s, ind, wb) {
    $("wx-temp").textContent = `${Math.round(last(s.temperature_c))}°`;
    $("wx-list").innerHTML = `
      <div>${FSUI.icon("solar:waterdrops-linear", 16)} ${t("wx.soil")} ${Math.round(ind.soil_moisture * 100)} %</div>
      <div>${FSUI.icon("solar:sun-2-linear", 16)} ${t("wx.solar")} ${ind.solar_radiation} MJ/m²</div>
      <div>${FSUI.icon("solar:wind-linear", 16)} ${t("wx.et")} ${ind.evapotranspiration} mm/j</div>`;
    const items = [
      { v: wb.available_water_mm, cls: "green", lbl: t("wx.available") },
      { v: wb.crop_water_need_mm, cls: "olive", lbl: t("wx.need") },
    ];
    $("wx-stripes").innerHTML = items.map((x) => `
      <div class="stripe-item" style="flex:${Math.max(1, x.v)}">
        <div class="lbl">${x.v} mm<small>${x.lbl}</small></div>
        <div class="stripe ${x.cls}"></div>
      </div>`).join("");
  }

  FSUI.dataPage(render);
})();
