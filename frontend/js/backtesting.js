/* Field Shift — backtesting : « l'outil aurait-il prévenu lors des sécheresses passées ? ». */
(function () {
  const t = (k) => FSI18N.t(k);
  const BADGE = { low: "badge-green", moderate: "badge-amber", high: "badge-red" };

  async function load() {
    const loading = document.getElementById("loading");
    try {
      const res = await FSApi.getBacktesting(FSStore.buildPayload());
      loading.classList.add("hidden");
      document.getElementById("content").classList.remove("hidden");
      render(res.data);
    } catch (e) {
      loading.innerHTML = `<p class="c-red" style="margin-bottom:16px">${t("panel.error")}</p>
        <button class="btn btn-dark" onclick="location.reload()">${t("panel.retry")}</button>`;
    }
  }

  function render(data) {
    document.getElementById("bt-summary").textContent = data.summary;
    document.getElementById("bt-list").innerHTML = data.seasons.map((s) => {
      const tag = s.tag && s.tag !== "—" ? `<span class="badge badge-yellow">${s.tag}</span>` : "";
      const pct = Math.min(100, s.rainfall_pct);
      return `<article class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px"><h3 style="font-size:22px">${s.season}</h3>${tag}</div>
          <span class="badge ${BADGE[s.risk_level] || "badge-gray"}">${t("bt.alert")} · ${s.risk_score}</span>
        </div>
        <div class="bar"><div style="width:${pct}%;background:${pct < 70 ? "#E5A12A" : "#3F9D22"}"></div></div>
        <p class="small muted" style="margin-top:8px">${t("bt.rainfall")} : <b>${s.rainfall_pct} %</b></p>
        <p class="bold ${s.warned ? "c-red" : "c-green"}" style="display:flex;align-items:center;gap:8px;margin-top:12px">
          ${FSUI.icon(s.warned ? "solar:danger-triangle-bold" : "solar:check-circle-bold", 20)} ${s.outcome}
        </p>
      </article>`;
    }).join("");
  }

  document.addEventListener("fs:langchange", load);
  load();
})();
