/* Field Shift — copiloto IA (chat). Explica la recomendación ya calculada. */
(function () {
  const chat = document.getElementById("chat");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("q");

  function bubble(text, who) {
    const el = document.createElement("div");
    const mine = who === "user";
    el.className = "fs-card p-3 text-sm max-w-[85%] " +
      (mine ? "ml-auto bg-green-50" : "mr-auto");
    el.style.whiteSpace = "pre-wrap";
    el.textContent = text;
    chat.appendChild(el);
    el.scrollIntoView({ behavior: "smooth", block: "end" });
    return el;
  }

  function sources(list) {
    if (!list || !list.length) return;
    const el = document.createElement("p");
    el.className = "text-xs text-gray-400 mr-auto";
    el.textContent = FSI18N.t("copilot.sources") + " " + list.join(" · ");
    chat.appendChild(el);
  }

  // Mensaje de bienvenida con el contexto del campo.
  const reco = FSStore.getLastReco();
  if (reco) {
    bubble(reco.ai_explanation || "", "bot");
  } else {
    bubble(FSI18N.lang === "en"
      ? "Select a field and fill your profile first, then I can explain your recommendation."
      : "Primero selecciona un campo y completa tu perfil; luego podré explicar tu recomendación.", "bot");
  }

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

  // Preguntas sugeridas (chips) — ayudan al agricultor a empezar.
  const SUGG = {
    es: ["¿Tengo suficiente agua?", "¿Cuándo debo sembrar?",
         "¿Qué rotación me conviene?", "No tengo riego, ¿qué hago?"],
    en: ["Do I have enough water?", "When should I plant?",
         "Which rotation fits me?", "I have no irrigation, what should I do?"],
  };
  function renderChips() {
    const box = document.getElementById("chips");
    box.innerHTML = "";
    (SUGG[FSI18N.lang] || SUGG.es).forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip-q";
      b.textContent = q;
      b.addEventListener("click", () => { input.value = q; form.requestSubmit(); });
      box.appendChild(b);
    });
  }
  renderChips();
  document.addEventListener("fs:langchange", renderChips);
})();
