/* Field Shift — mise en page commune + helpers partagés.
   Chaque page déclare <body data-page="..."> et <header id="topbar"></header>. */
(function () {
  const NAV = [
    { id: "dashboard", href: "/panel.html", key: "nav.dashboard" },
    { id: "analyse", href: "/analyse.html", key: "nav.analyse" },
    { id: "plan", href: "/plan.html", key: "nav.plan" },
    { id: "history", href: "/backtesting.html", key: "nav.backtest" },
    { id: "assistant", href: "/copiloto.html", key: "nav.assistant" },
  ];

  // Logo : éventail de feuilles (rappel de la maquette « serre »).
  const LEAF = "M20 34 C16.4 28 16.4 19 20 12.5 C23.6 19 23.6 28 20 34Z";
  const LOGO = `<svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true"><g fill="#151515" stroke="#F2F2EF" stroke-width="1.3">${
    [-64, -32, 0, 32, 64].map((a) => `<path d="${LEAF}" transform="rotate(${a} 20 34)"/>`).join("")}</g></svg>`;

  function icon(name, size) {
    const s = size || 20;
    return `<iconify-icon icon="${name}" width="${s}" height="${s}"></iconify-icon>`;
  }

  function renderTopbar() {
    const host = document.getElementById("topbar");
    if (!host) return;
    const page = document.body.dataset.page || "";
    const reco = FSStore.getLastReco();
    const alert = !!(reco && (reco.risk_components || []).some((c) => c.level === "bad"));
    host.className = "topbar";
    host.innerHTML = `
      <a class="brand" href="/index.html"><span class="brand-mark">${LOGO}</span><span data-i18n="app.name"></span></a>
      <nav class="tabs" aria-label="Navigation">${NAV.map((n) =>
        `<a class="tab${n.id === page ? " is-active" : ""}" href="${n.href}" data-i18n="${n.key}"></a>`).join("")}</nav>
      <div class="top-right">
        <button class="icon-btn" data-lang-label onclick="FSI18N.cycle()" aria-label="Langue / Language"></button>
        <a class="icon-btn" href="/analyse.html#alerts" aria-label="${FSI18N.t("alerts.title")}">${icon("solar:bell-linear")}${alert ? '<span class="dot"></span>' : ""}</a>
        <a class="user-pill" href="/perfil.html">
          <span class="av">${icon("solar:user-rounded-bold", 18)}</span>
          <span class="who"><b data-i18n="user.name"></b><span data-i18n="user.role"></span></span>
          ${icon("solar:alt-arrow-down-linear", 16)}
        </a>
      </div>`;
    FSI18N.apply(host);

    if (!document.getElementById("offline-banner")) {
      const b = document.createElement("div");
      b.id = "offline-banner";
      b.setAttribute("data-i18n", "common.offline");
      document.body.prepend(b);
      FSI18N.apply(b);
    }
  }

  const RISK_COLOR = { low: "#3F9D22", moderate: "#E5A12A", high: "#D6462B" };

  function ring(score, color, size, stroke) {
    const S = size || 150, W = stroke || 12, r = (S - W) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
    return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="transform:rotate(-90deg)">
      <circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="#ECECE8" stroke-width="${W}"/>
      <circle cx="${S / 2}" cy="${S / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${W}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
  }

  function parseWindow(str) {
    const m = String(str || "").match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
    return m ? [new Date(m[1] + "T00:00:00"), new Date(m[2] + "T00:00:00")] : null;
  }
  const fmtDay = (d) => d.toLocaleDateString(FSI18N.locale, { weekday: "short", day: "numeric", month: "short" });
  const fmtShort = (d) => d.toLocaleDateString(FSI18N.locale, { day: "numeric", month: "short" });
  const fmtWindow = (str) => { const w = parseWindow(str); return w ? `${fmtShort(w[0])} → ${fmtShort(w[1])}` : (str || "—"); };

  function cropKey() { return (FSStore.getProfile() || {}).crop || "maize"; }
  function cropLabel() { return FSI18N.t("crop." + cropKey()); }

  function stamp(el, res, data) {
    if (!el) return;
    const time = new Date().toLocaleTimeString(FSI18N.locale, { hour: "2-digit", minute: "2-digit" });
    let html = `<span class="mock-chip">${icon("solar:refresh-linear", 14)} ${FSI18N.t("panel.updated")} ${time}</span>`;
    if (res && res.offline) html += ` <span class="mock-chip">${icon("solar:cloud-cross-linear", 14)} ${FSI18N.t("panel.offline")}</span>`;
    else if (data && data._mock) html += ` <span class="mock-chip">${icon("solar:settings-linear", 14)} ${FSI18N.t("panel.mock")}</span>`;
    el.innerHTML = html;
  }

  /* Cycle de vie d'une page « données » : garde-fou, chargement, erreur,
     rechargement au changement de langue (les textes serveur sont localisés). */
  function dataPage(render, opts) {
    const o = opts || {};
    if (o.requireField !== false && !FSStore.getField()) { window.location.replace("/campo.html"); return; }
    const loading = document.getElementById("loading");
    const content = document.getElementById("content");
    async function run() {
      try {
        const res = await FSApi.getRecommendation(FSStore.buildPayload());
        if (loading) loading.classList.add("hidden");
        if (content) content.classList.remove("hidden");
        render(res.data, res);
        renderTopbar();
      } catch (e) {
        if (loading) {
          loading.innerHTML = `<p class="c-red" style="margin-bottom:16px">${FSI18N.t("panel.error")}</p>
            <button class="btn btn-dark" onclick="location.reload()">${FSI18N.t("panel.retry")}</button>`;
        }
      }
    }
    document.addEventListener("fs:langchange", run);
    run();
  }

  if (window.Chart) {
    Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
    Chart.defaults.color = "#9B9B94";
    Chart.defaults.plugins.legend.display = false;
  }

  window.FSUI = { icon, ring, RISK_COLOR, parseWindow, fmtDay, fmtShort, fmtWindow, cropKey, cropLabel, stamp, dataPage, renderTopbar };
  renderTopbar();
})();
