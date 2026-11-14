/* Field Shift — assistant (chat). Explique la recommandation déjà calculée. */
(function () {
  const t = (k) => FSI18N.t(k);
  const chat = document.getElementById("chat");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("q");

  // Crée une bulle ; renvoie l'élément texte (pour le mettre à jour ensuite).
  function bubble(text, who) {
    let textEl;
    if (who === "user") {
      textEl = document.createElement("div");
      textEl.className = "msg-user";
      textEl.textContent = text;
      chat.appendChild(textEl);
    } else {
      const wrap = document.createElement("div");
      wrap.className = "msg-bot";
      wrap.innerHTML = `<span class="bot-av">${FSUI.icon("solar:stars-bold", 20)}</span>`;
      textEl = document.createElement("div");
      textEl.className = "bub";
      textEl.textContent = text;
      wrap.appendChild(textEl);
      chat.appendChild(wrap);
    }
    chat.scrollTop = chat.scrollHeight;
    return textEl;
  }

  function sources(list) {
    if (!list || !list.length) return;
    const el = document.createElement("p");
    el.className = "msg-src";
    el.textContent = t("copilot.sources") + " " + list.join(" · ");
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  function context() {
    const reco = FSStore.getLastReco();
    const chip = document.getElementById("ctx-chip");
    if (!reco) { chip.classList.add("hidden"); return; }
    chip.innerHTML = `${FSUI.icon("solar:map-point-linear", 14)} ${FSUI.cropLabel()} · ${t("dash.risk")} ${t("risk." + reco.risk_level)}`;
    chip.classList.remove("hidden");
  }

  function welcome() {
    const reco = FSStore.getLastReco();
    bubble(reco ? (reco.ai_explanation || "") : t("copilot.welcome_nofield"), "bot");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    bubble(q, "user");
    input.value = "";
    const thinking = bubble(t("common.loading"), "bot");
    const res = await FSApi.askCopilot(q, FSStore.getLastReco());
    thinking.textContent = res.answer;
    sources(res.sources);
  });

  function renderChips() {
    const box = document.getElementById("chips");
    box.innerHTML = "";
    ["copilot.sugg1", "copilot.sugg2", "copilot.sugg3", "copilot.sugg4"].forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = t(k);
      b.addEventListener("click", () => { input.value = b.textContent; form.requestSubmit(); });
      box.appendChild(b);
    });
  }

  context();
  welcome();
  renderChips();
  document.addEventListener("fs:langchange", () => { renderChips(); context(); });
})();
