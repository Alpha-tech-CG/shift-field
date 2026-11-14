/* Field Shift — i18n sencillo (Español primero, Inglés disponible).
   Uso en HTML:  <span data-i18n="home.start"></span>
   Cambio de idioma:  FSI18N.setLang('en') */
(function () {
  const DICT = {
    es: {
      "app.name": "Field Shift",
      "app.tagline": "Decide qué sembrar antes de la sequía, no después.",
      "nav.home": "Inicio",
      "nav.field": "Campo",
      "nav.profile": "Perfil",
      "nav.panel": "Panel",
      "nav.copilot": "Copiloto",
      "common.loading": "Calculando…",
      "common.back": "Atrás",
      "common.continue": "Continuar",
      "common.offline": "Sin conexión — mostrando los últimos datos guardados",
      "common.lang": "EN",

      "home.title": "Field Shift",
      "home.subtitle": "Planificación de cultivos resistente al clima, con datos NASA.",
      "home.intro": "Te ayuda a responder, antes de sembrar: ¿cuánto riesgo de sequía tengo?, ¿tengo suficiente agua?, ¿cuándo sembrar? y ¿qué rotación me conviene?",
      "home.start": "Empezar",
      "home.q1": "¿Cuál es el riesgo de sequía en mi campo?",
      "home.q2": "¿Tengo suficiente agua para este cultivo?",
      "home.q3": "¿Cuándo debo sembrar?",
      "home.q4": "¿Qué rotación protege mejor mi suelo?",

      "field.title": "Selecciona tu campo",
      "field.help": "Toca el mapa para ubicar tu parcela. Puedes mover el marcador.",
      "field.selected": "Campo seleccionado:",
      "field.none": "Aún no has seleccionado un campo.",
      "field.use": "Usar este campo",

      "profile.title": "Tu parcela",
      "profile.crop": "Cultivo que quieres sembrar",
      "profile.soil": "Tipo de suelo",
      "profile.irrigation": "¿Tienes riego?",
      "profile.irrigation.yes": "Sí",
      "profile.irrigation.no": "No",
      "profile.priority": "Tu prioridad",
      "profile.prio.water": "Ahorrar agua",
      "profile.prio.balanced": "Equilibrio",
      "profile.prio.yield": "Máxima producción",
      "profile.submit": "Ver recomendación",
      "crop.maize": "Maíz",
      "crop.beans": "Frijol",
      "crop.sorghum": "Sorgo",
      "crop.millet": "Mijo",
      "crop.cover_crop": "Cultivo de cobertura",
      "soil.sandy": "Arenoso",
      "soil.sandy_loam": "Franco-arenoso",
      "soil.loam": "Franco",
      "soil.clay_loam": "Franco-arcilloso",
      "soil.clay": "Arcilloso",

      "panel.title": "Panel del campo",
      "panel.risk": "Riesgo de sequía",
      "panel.water": "Presupuesto de agua",
      "panel.timeline": "¿Cuándo sembrar?",
      "panel.rotations": "Planes de rotación",
      "panel.indicators": "Indicadores NASA",
      "panel.ai": "Explicación",
      "panel.need": "Necesita",
      "panel.available": "Disponible",
      "panel.deficit": "Déficit",
      "panel.cooperativa": "Tarjeta de cooperativa",
      "panel.ask": "Preguntar al copiloto",
      "risk.low": "Bajo",
      "risk.moderate": "Moderado",
      "risk.high": "Alto",
      "water.enough_water": "Suficiente agua",
      "water.risky": "Agua justa",
      "water.not_enough_water": "Agua insuficiente",
      "plant.plant_now": "Sembrar ahora",
      "plant.wait": "Esperar",
      "plant.switch_crop": "Cambiar de cultivo o rotación",
      "plant.window": "Mejor ventana",
      "rot.safest": "Más seguro",
      "rot.balanced": "Equilibrado",
      "rot.highest_yield": "Mayor producción",
      "ind.rainfall": "Lluvia 60 días",
      "ind.rainfall_normal": "Lluvia normal",
      "ind.soil_moisture": "Humedad del suelo",
      "ind.ndvi": "Tendencia NDVI",
      "ind.solar": "Radiación solar",
      "ind.et": "Evapotranspiración",

      "copilot.title": "Copiloto agrícola",
      "copilot.help": "Pregunta en lenguaje sencillo. Explica la recomendación, no la reemplaza.",
      "copilot.placeholder": "Ej.: No tengo riego y quiero sembrar maíz. ¿Qué hago?",
      "copilot.send": "Enviar",
      "copilot.sources": "Fuentes:",

      "coop.title": "Tarjeta de cooperativa",
      "coop.help": "Resumen para compartir o imprimir.",
      "coop.print": "Imprimir",
      "coop.risk": "Nivel de riesgo local",
      "coop.water": "Presupuesto de agua",
      "coop.rotation": "Rotación recomendada",
      "coop.planting": "Consejo de siembra",
      "coop.actions": "Acciones inmediatas",
      "coop.sources": "Fuentes de datos NASA",
      "coop.scan": "Escanea para abrir Field Shift",
    },
    en: {
      "app.name": "Field Shift",
      "app.tagline": "Decide what to plant before a drought hits, not after.",
      "nav.home": "Home",
      "nav.field": "Field",
      "nav.profile": "Profile",
      "nav.panel": "Panel",
      "nav.copilot": "Copilot",
      "common.loading": "Calculating…",
      "common.back": "Back",
      "common.continue": "Continue",
      "common.offline": "Offline — showing last saved data",
      "common.lang": "ES",

      "home.title": "Field Shift",
      "home.subtitle": "Climate-resilient crop planning, powered by NASA data.",
      "home.intro": "Helps you answer, before planting: how much drought risk?, do I have enough water?, when to plant?, and which rotation fits?",
      "home.start": "Start",
      "home.q1": "What is the drought risk on my field?",
      "home.q2": "Do I have enough water for this crop?",
      "home.q3": "When should I plant?",
      "home.q4": "Which rotation best protects my soil?",

      "field.title": "Select your field",
      "field.help": "Tap the map to place your plot. You can drag the marker.",
      "field.selected": "Selected field:",
      "field.none": "You haven't selected a field yet.",
      "field.use": "Use this field",

      "profile.title": "Your plot",
      "profile.crop": "Crop you want to plant",
      "profile.soil": "Soil type",
      "profile.irrigation": "Do you have irrigation?",
      "profile.irrigation.yes": "Yes",
      "profile.irrigation.no": "No",
      "profile.priority": "Your priority",
      "profile.prio.water": "Save water",
      "profile.prio.balanced": "Balanced",
      "profile.prio.yield": "Max yield",
      "profile.submit": "See recommendation",
      "crop.maize": "Maize",
      "crop.beans": "Beans",
      "crop.sorghum": "Sorghum",
      "crop.millet": "Millet",
      "crop.cover_crop": "Cover crop",
      "soil.sandy": "Sandy",
      "soil.sandy_loam": "Sandy loam",
      "soil.loam": "Loam",
      "soil.clay_loam": "Clay loam",
      "soil.clay": "Clay",

      "panel.title": "Field panel",
      "panel.risk": "Drought risk",
      "panel.water": "Water budget",
      "panel.timeline": "When to plant?",
      "panel.rotations": "Rotation plans",
      "panel.indicators": "NASA indicators",
      "panel.ai": "Explanation",
      "panel.need": "Needs",
      "panel.available": "Available",
      "panel.deficit": "Deficit",
      "panel.cooperativa": "Cooperative card",
      "panel.ask": "Ask the copilot",
      "risk.low": "Low",
      "risk.moderate": "Moderate",
      "risk.high": "High",
      "water.enough_water": "Enough water",
      "water.risky": "Tight",
      "water.not_enough_water": "Not enough water",
      "plant.plant_now": "Plant now",
      "plant.wait": "Wait",
      "plant.switch_crop": "Switch crop or rotation",
      "plant.window": "Best window",
      "rot.safest": "Safest",
      "rot.balanced": "Balanced",
      "rot.highest_yield": "Highest yield",
      "ind.rainfall": "Rain 60 days",
      "ind.rainfall_normal": "Normal rain",
      "ind.soil_moisture": "Soil moisture",
      "ind.ndvi": "NDVI trend",
      "ind.solar": "Solar radiation",
      "ind.et": "Evapotranspiration",

      "copilot.title": "Farming copilot",
      "copilot.help": "Ask in simple language. It explains the recommendation, it does not replace it.",
      "copilot.placeholder": "e.g.: I have no irrigation and want to plant maize. What should I do?",
      "copilot.send": "Send",
      "copilot.sources": "Sources:",

      "coop.title": "Cooperative card",
      "coop.help": "Summary to share or print.",
      "coop.print": "Print",
      "coop.risk": "Local risk level",
      "coop.water": "Water budget",
      "coop.rotation": "Recommended rotation",
      "coop.planting": "Planting advice",
      "coop.actions": "Immediate actions",
      "coop.sources": "NASA data sources",
      "coop.scan": "Scan to open Field Shift",
    },
  };

  const KEY = "fs_lang";
  let lang = localStorage.getItem(KEY) || "es";

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || (DICT.es[key]) || key;
  }

  function apply(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    (root || document).querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    document.documentElement.lang = lang;
  }

  function setLang(l) {
    lang = l === "en" ? "en" : "es";
    localStorage.setItem(KEY, lang);
    apply();
    document.dispatchEvent(new CustomEvent("fs:langchange", { detail: { lang } }));
  }

  function toggle() { setLang(lang === "es" ? "en" : "es"); }

  window.FSI18N = { t, apply, setLang, toggle, get lang() { return lang; } };
  document.addEventListener("DOMContentLoaded", () => apply());
})();
