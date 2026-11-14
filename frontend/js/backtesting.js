/* Field Shift — backtesting : « l'outil aurait-il prévenu lors des sécheresses passées ? ». */
(function () {
  const t = (k) => FSI18N.t(k);
  let data = null;
  const RISK = { low: "risk-low-soft", moderate: "risk-moderate-soft", high: "risk-high-soft" };

  async function load() {
    try {
      const res = await FSApi.getBacktesting(FSStore.buildPayload());
      data = res.data;
      document.getElementById("loading").classList.add("hidden");
      document.getElementById("content").classList.remove("hidden");
      render();
    } catch (e) {
      document.getElementById("loading").innerHTML = `<p class="text-destructive">${t("panel.error")}</p>`;
    }
  }

  function render() {
    document.getElementById("bt-summary").textContent = data.summary;
    document.getElementById("bt-list").innerHTML = data.seasons.map((s) => {
      const badge = RISK[s.risk_level] || "risk-moderate-soft";
      const icon = s.warned ? "solar:danger-triangle-linear" : "solar:check-circle-linear";
      const iconColor = s.warned ? "text-destructive" : "text-chart-4";
      const tag = (s.tag && s.tag !== "—")
        ? `<span class="rounded-full bg-accent/20 text-accent-foreground px-2 py-0.5 text-xs font-semibold">${s.tag}</span>` : "";
      return `<article class="rounded-3xl bg-card border border-border p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-heading text-lg font-bold">${s.season}</span>${tag}
          </div>
          <span class="rounded-full ${badge} px-3 py-1 text-sm font-semibold">${t("bt.alert")} : ${s.risk_score}</span>
        </div>
        <div class="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div class="h-full rounded-full bg-chart-1" style="width:${Math.min(100, s.rainfall_pct)}%"></div>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">${t("bt.rainfall")} : ${s.rainfall_pct}%</p>
        <div class="mt-3 flex items-center gap-2 ${iconColor} font-medium text-sm">
          <iconify-icon icon="${icon}" width="20" height="20"></iconify-icon><span>${s.outcome}</span>
        </div>
      </article>`;
    }).join("");
  }

  document.addEventListener("fs:langchange", () => { load(); });
  load();
})();
