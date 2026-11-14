/* Field Shift — capa de acceso a la API.
   - Llama al backend FastAPI (/api/*).
   - Si no hay conexión, usa la última recomendación guardada (modo offline PWA).
   El formato de la respuesta sigue el contrato acordado (sección 8.6). */
(function () {
  const BASE = ""; // mismo origen: el backend sirve el front.

  async function getRecommendation(payload) {
    try {
      const res = await fetch(BASE + "/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      FSStore.setLastReco(data);
      return { data, offline: false };
    } catch (e) {
      const cached = FSStore.getLastReco();
      if (cached) return { data: cached, offline: true };
      throw e; // sin conexión y sin caché: la UI mostrará el error.
    }
  }

  async function askCopilot(question, context) {
    try {
      const res = await fetch(BASE + "/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      return {
        answer: FSI18N.lang === "en"
          ? "I can't reach the server right now. Please try again when you are online."
          : "No puedo conectar con el servidor ahora. Intenta de nuevo cuando tengas conexión.",
        sources: [], limitations: "offline", _mock: true,
      };
    }
  }

  window.FSApi = { getRecommendation, askCopilot };
})();
