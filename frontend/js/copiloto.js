/* Field Shift — assistant (chat). Explique la recommandation déjà calculée. */
(function () {
  const chat = document.getElementById("chat");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("q");

  // Crée une bulle ; renvoie l'élément texte (pour le mettre à jour ensuite).
  function bubble(text, who) {
    const wrap = document.createElement("div");
    let textEl;
    if (who === "user") {
      wrap.className = "flex justify-end";
      textEl = document.createElement("p");
      textEl.className = "max-w-[80%] rounded-3xl rounded-br-md bg-primary text-primary-foreground px-5 py-4 text-base leading-relaxed";
      textEl.style.whiteSpace = "pre-wrap";
      textEl.textContent = text;
      wrap.appendChild(textEl);
    } else {
      wrap.className = "flex gap-3";
      const av = document.createElement("div");
      av.className = "size-10 shrink-0 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center";
      av.innerHTML = '<iconify-icon icon="solar:stars-bold" width="20" height="20"></iconify-icon>';
      textEl = document.createElement("div");
      textEl.className = "flex-1 rounded-3xl rounded-tl-md bg-card border border-border p-5 text-base";
      textEl.style.whiteSpace = "pre-wrap";
      textEl.textContent = text;
      wrap.appendChild(av);
      wrap.appendChild(textEl);
    }
    chat.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "end" });
    return textEl;
  }

  function sources(list) {
    if (!list || !list.length) return;
    const el = document.createElement("p");
    el.className = "text-xs text-muted-foreground";
    el.style.marginLeft = "52px";
    el.textContent = FSI18N.t("copilot.sources") + " " + list.join(" · ");
    chat.appendChild(el);
  }

  function welcome() {
    const reco = FSStore.getLastReco();
    bubble(reco ? (reco.ai_explanation || "") : FSI18N.t("copilot.welcome_nofield"), "bot");
  }
  welcome();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    bubble(q, "user");
    input.value = "";
    const thinking = bubble(FSI18N.t("common.loading"), "bot");
    const res = await FSApi.askCopilot(q, FSStore.getLastReco());
    thinking.textContent = res.answer;
    sources(res.sources);
  });

  // Questions suggérées (chips).
  function renderChips() {
    const box = document.getElementById("chips");
    box.innerHTML = "";
    ["copilot.sugg1", "copilot.sugg2", "copilot.sugg3", "copilot.sugg4"].forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "h-11 shrink-0 rounded-full border border-border bg-card px-4 text-sm font-medium";
      b.textContent = FSI18N.t(k);
      b.addEventListener("click", () => { input.value = b.textContent; form.requestSubmit(); });
      box.appendChild(b);
    });
  }
  renderChips();
  document.addEventListener("fs:langchange", renderChips);
})();
