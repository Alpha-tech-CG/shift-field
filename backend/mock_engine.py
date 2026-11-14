"""Field Shift — Moteur MOCK de recommandations (Flux 1), multilingue.

Génère une recommandation plausible au format du contrat d'API (document
d'équipe, section 8.6). Permet au Flux 1 (front/PWA) de travailler sans le
moteur réel de données NASA + ML + IA du Flux 2.

Les textes sont localisés en FR / EN / IT selon le champ `lang` de l'entrée
(défaut : fr). Le Flux 2 remplacera ce module par le vrai pipeline en gardant
ce format de sortie.
"""
from __future__ import annotations

import hashlib
import math
from datetime import date, timedelta
from typing import Any

# --- Données agronomiques de démonstration (mm/saison approx.) -------------
CROP_WATER_NEED_MM: dict[str, int] = {
    "maize": 520, "beans": 350, "sorghum": 400, "millet": 380, "cover_crop": 300,
}
SOIL_RETENTION: dict[str, float] = {
    "sandy": 0.55, "sandy_loam": 0.75, "loam": 1.0, "clay_loam": 1.15, "clay": 1.25,
}

# --- Textes localisés ------------------------------------------------------
CROP_LABEL = {
    "fr": {"maize": "maïs", "beans": "haricot", "sorghum": "sorgho", "millet": "millet", "cover_crop": "culture de couverture"},
    "en": {"maize": "maize", "beans": "beans", "sorghum": "sorghum", "millet": "millet", "cover_crop": "cover crop"},
    "it": {"maize": "mais", "beans": "fagioli", "sorghum": "sorgo", "millet": "miglio", "cover_crop": "coltura di copertura"},
}
RISK_WORD = {
    "fr": {"low": "bas", "moderate": "modéré", "high": "élevé"},
    "en": {"low": "low", "moderate": "moderate", "high": "high"},
    "it": {"low": "basso", "moderate": "moderato", "high": "alto"},
}
WS_WORD = {
    "fr": {"enough_water": "assez d'eau", "risky": "eau juste", "not_enough_water": "eau insuffisante"},
    "en": {"enough_water": "enough water", "risky": "tight water", "not_enough_water": "not enough water"},
    "it": {"enough_water": "acqua sufficiente", "risky": "acqua al limite", "not_enough_water": "acqua insufficiente"},
}
TXT = {
    "fr": {
        "water_expl": "La pluie et l'humidité du sol couvrent environ {cov}% du besoin estimé de la culture.",
        "reason_plant_now": "L'humidité du sol et la pluie attendue couvrent le besoin de la culture. Les conditions sont favorables au semis.",
        "reason_wait": "L'humidité du sol est limitée et la pluie attendue encore insuffisante. Mieux vaut attendre la prochaine fenêtre de pluie.",
        "reason_switch": "Le déficit d'eau est élevé pour cette culture. Envisage une culture plus résistante ou une rotation qui réduit le risque.",
        "rot_safest_name": "Haricot → Sorgho → Couverture",
        "rot_safest_reason": "Réduit la dépendance à l'eau et garde le sol couvert. Le sorgho tolère la sécheresse et la couverture protège le sol entre deux saisons.",
        "rot_balanced_name": "Légumineuse → Céréale → Couverture/jachère",
        "rot_balanced_reason": "Maintient la production et améliore la santé du sol grâce à la rotation avec des légumineuses fixatrices d'azote.",
        "rot_yield_name": "Maïs (avec alertes de risque hydrique)",
        "rot_yield_reason": "Maximise le rendement quand il y a assez d'eau, mais exige de surveiller de près la pluie et l'humidité du sol.",
        "ai": "Ton champ présente un risque de sécheresse {risk} (score {score}/100). Pour le {crop}, le besoin estimé est de {need} mm et l'eau disponible de {avail} mm, soit {ws}. {tail} Sources NASA utilisées : GPM IMERG (pluie), SMAP (humidité), MODIS/VIIRS (NDVI) et NASA POWER (rayonnement et évapotranspiration).",
        "ai_tail_plant": "Tu peux semer dans la fenêtre recommandée.",
        "ai_tail_other": "Mieux vaut attendre ou envisager une rotation plus résistante.",
    },
    "en": {
        "water_expl": "Rainfall and soil moisture cover about {cov}% of the crop's estimated need.",
        "reason_plant_now": "Soil moisture and expected rainfall cover the crop's need. Conditions are suitable for planting.",
        "reason_wait": "Soil moisture is limited and expected rainfall still insufficient. Better wait for the next rain window.",
        "reason_switch": "The water deficit is high for this crop. Consider a more resilient crop or a rotation that lowers the risk.",
        "rot_safest_name": "Beans → Sorghum → Cover crop",
        "rot_safest_reason": "Cuts water dependence and keeps the soil covered. Sorghum tolerates drought and the cover crop protects the soil between seasons.",
        "rot_balanced_name": "Legume → Cereal → Cover/fallow",
        "rot_balanced_reason": "Maintains production and improves soil health through rotation with nitrogen-fixing legumes.",
        "rot_yield_name": "Maize (with water-risk alerts)",
        "rot_yield_reason": "Maximizes yield when there is enough water, but requires close watch on rainfall and soil moisture.",
        "ai": "Your field has {risk} drought risk (score {score}/100). For {crop}, the estimated need is {need} mm and available water {avail} mm, i.e. {ws}. {tail} NASA sources used: GPM IMERG (rain), SMAP (moisture), MODIS/VIIRS (NDVI) and NASA POWER (radiation and evapotranspiration).",
        "ai_tail_plant": "You can plant within the recommended window.",
        "ai_tail_other": "Better wait or consider a more resilient rotation.",
    },
    "it": {
        "water_expl": "Pioggia e umidità del suolo coprono circa il {cov}% del fabbisogno stimato della coltura.",
        "reason_plant_now": "L'umidità del suolo e la pioggia attesa coprono il fabbisogno della coltura. Le condizioni sono adatte alla semina.",
        "reason_wait": "L'umidità del suolo è limitata e la pioggia attesa ancora insufficiente. Meglio aspettare la prossima finestra di pioggia.",
        "reason_switch": "Il deficit idrico è elevato per questa coltura. Valuta una coltura più resistente o una rotazione che riduca il rischio.",
        "rot_safest_name": "Fagioli → Sorgo → Copertura",
        "rot_safest_reason": "Riduce la dipendenza dall'acqua e mantiene il suolo coperto. Il sorgo tollera la siccità e la copertura protegge il suolo tra le stagioni.",
        "rot_balanced_name": "Legume → Cereale → Copertura/maggese",
        "rot_balanced_reason": "Mantiene la produzione e migliora la salute del suolo grazie alla rotazione con legumi azotofissatori.",
        "rot_yield_name": "Mais (con avvisi di rischio idrico)",
        "rot_yield_reason": "Massimizza la resa quando c'è abbastanza acqua, ma richiede di monitorare da vicino pioggia e umidità del suolo.",
        "ai": "Il tuo campo ha un rischio di siccità {risk} (punteggio {score}/100). Per il {crop}, il fabbisogno stimato è {need} mm e l'acqua disponibile {avail} mm, cioè {ws}. {tail} Fonti NASA usate: GPM IMERG (pioggia), SMAP (umidità), MODIS/VIIRS (NDVI) e NASA POWER (radiazione ed evapotraspirazione).",
        "ai_tail_plant": "Puoi seminare nella finestra consigliata.",
        "ai_tail_other": "Meglio aspettare o valutare una rotazione più resistente.",
    },
}


def _L(lang: str) -> str:
    return lang if lang in TXT else "fr"


def _seed(latitude: float, longitude: float) -> float:
    key = f"{round(latitude, 3)}:{round(longitude, 3)}"
    return int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def _risk_level(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "moderate"
    return "low"


def generate_recommendation(payload: dict[str, Any]) -> dict[str, Any]:
    lang = _L(str(payload.get("lang", "fr")))
    T = TXT[lang]

    latitude = float(payload.get("latitude", 14.8))
    longitude = float(payload.get("longitude", -90.5))
    crop = str(payload.get("crop", "maize"))
    soil_type = str(payload.get("soil_type", "sandy_loam"))
    irrigation = bool(payload.get("irrigation", False))
    priority = str(payload.get("priority", "balanced"))

    s = _seed(latitude, longitude)

    # Indicateurs NASA simulés
    rainfall_normal = round(160 + s * 120)
    rainfall_60d = round(rainfall_normal * (0.35 + s * 0.6))
    soil_moisture = round(0.08 + s * 0.22, 2)
    ndvi_trend = round(-0.20 + s * 0.28, 2)
    solar_radiation = round(18.0 + s * 8.0, 1)
    evapotranspiration = round(3.8 + s * 2.2, 1)

    # Budget d'eau
    retention = SOIL_RETENTION.get(soil_type, 1.0)
    expected_rain = round(rainfall_normal * (0.25 + s * 0.2))
    soil_contrib = round(soil_moisture * 1000 * retention * 0.4)
    irrigation_mm = 120 if irrigation else 0
    available_water = round(rainfall_60d * 0.6 + expected_rain + soil_contrib + irrigation_mm)
    crop_water_need = round(CROP_WATER_NEED_MM.get(crop, 450) * (0.9 + evapotranspiration / 20))
    deficit = max(0, crop_water_need - available_water)
    coverage = min(1.0, available_water / crop_water_need)

    if deficit <= 0:
        water_status = "enough_water"
    elif deficit < 0.35 * crop_water_need:
        water_status = "risky"
    else:
        water_status = "not_enough_water"

    # Score de risque
    risk_score = int(max(0, min(100, 18 + (1 - coverage) * 55 + (1.25 - retention) * 18
                   + max(0, -ndvi_trend) * 60 + (-10 if irrigation else 0))))
    risk_level = _risk_level(risk_score)

    # Fenêtre et recommandation de semis
    today = date.today()
    window_start = today + timedelta(days=6)
    window_end = window_start + timedelta(days=10)
    if risk_level == "low":
        planting_reco, planting_reason = "plant_now", T["reason_plant_now"]
    elif risk_level == "moderate":
        planting_reco, planting_reason = "wait", T["reason_wait"]
    else:
        planting_reco, planting_reason = "switch_crop", T["reason_switch"]

    # Rotations
    rotations = [
        {"type": "safest", "name": T["rot_safest_name"], "water_saving": "high",
         "soil_benefit": "high", "risk": "low", "reason": T["rot_safest_reason"]},
        {"type": "balanced", "name": T["rot_balanced_name"], "water_saving": "medium",
         "soil_benefit": "high", "risk": "moderate", "reason": T["rot_balanced_reason"]},
        {"type": "highest_yield", "name": T["rot_yield_name"], "water_saving": "low",
         "soil_benefit": "medium", "risk": "high" if risk_level == "high" else "moderate",
         "reason": T["rot_yield_reason"]},
    ]
    if priority == "save_water":
        rotations.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}[r["water_saving"]])
    elif priority == "max_yield":
        rotations.sort(key=lambda r: 0 if r["type"] == "highest_yield" else 1)

    # Explication IA
    ai_explanation = T["ai"].format(
        risk=RISK_WORD[lang][risk_level], score=risk_score,
        crop=CROP_LABEL[lang].get(crop, crop), need=crop_water_need, avail=available_water,
        ws=WS_WORD[lang][water_status],
        tail=T["ai_tail_plant"] if planting_reco == "plant_now" else T["ai_tail_other"],
    )

    # Séries temporelles (8 semaines) pour les graphiques
    n = 8
    labels = [(today - timedelta(weeks=(n - 1 - i))).strftime("%d/%m") for i in range(n)]

    def _serie(base, amp, ndigits=2):
        vals = [round(base + math.sin(i * 0.8 + s * 6.283) * amp, ndigits) for i in range(n)]
        vals[-1] = round(base, ndigits)
        return vals

    temperature_c = round(24 + s * 6, 1)
    rain_week = max(1, round(rainfall_60d / n))
    norm_week = max(1, round(rainfall_normal / n))
    series = {
        "labels": labels,
        "rainfall_mm": [max(0, int(v)) for v in _serie(rain_week, rain_week * 0.6, 0)],
        "rainfall_normal_mm": [norm_week] * n,
        "soil_moisture": [max(0.02, v) for v in _serie(soil_moisture, 0.03)],
        "ndvi": [min(0.9, max(0.1, v)) for v in _serie(0.55 + ndvi_trend, 0.05)],
        "temperature_c": _serie(temperature_c, 2.0, 1),
        "solar_radiation": _serie(solar_radiation, 2.0, 1),
    }

    # Décomposition du risque (chaque composante : valeur, niveau, source, poids).
    rc_rain = "bad" if rainfall_60d < 0.7 * rainfall_normal else "warn" if rainfall_60d < 0.9 * rainfall_normal else "ok"
    rc_soil = "bad" if soil_moisture < 0.12 else "warn" if soil_moisture < 0.2 else "ok"
    rc_ndvi = "bad" if ndvi_trend < -0.1 else "warn" if ndvi_trend < 0 else "ok"
    rc_heat = "bad" if evapotranspiration > 5.5 else "warn" if evapotranspiration > 4.5 else "ok"
    risk_components = [
        {"factor": "rainfall", "value": f"{rainfall_60d}/{rainfall_normal} mm", "level": rc_rain, "source": "GPM IMERG", "weight": "35%"},
        {"factor": "soil_moisture", "value": f"{soil_moisture} m³/m³", "level": rc_soil, "source": "SMAP", "weight": "25%"},
        {"factor": "ndvi", "value": f"{ndvi_trend}", "level": rc_ndvi, "source": "MODIS/VIIRS", "weight": "20%"},
        {"factor": "heat", "value": f"{evapotranspiration} mm/j · {temperature_c}°C", "level": rc_heat, "source": "NASA POWER", "weight": "20%"},
    ]

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "water_budget": {
            "status": water_status,
            "crop_water_need_mm": crop_water_need,
            "available_water_mm": available_water,
            "deficit_mm": deficit,
            "coverage_pct": round(coverage * 100),
            "explanation": T["water_expl"].format(cov=round(coverage * 100)),
        },
        "planting_timeline": {
            "recommendation": planting_reco,
            "best_window": f"{window_start.isoformat()} → {window_end.isoformat()}",
            "reason": planting_reason,
        },
        "rotations": rotations,
        "nasa_indicators": {
            "rainfall_60d_mm": rainfall_60d, "rainfall_normal_mm": rainfall_normal,
            "soil_moisture": soil_moisture, "ndvi_trend": ndvi_trend,
            "solar_radiation": solar_radiation, "evapotranspiration": evapotranspiration,
        },
        "ai_explanation": ai_explanation,
        "series": series,
        "risk_components": risk_components,
        "_mock": True,
    }


# --- Copilote (mock, orienté par l'intention de la question) ---------------
INTENT_KW = {
    "water": ["eau", "agua", "acqua", "water", "assez", "enough", "suffis", "suffic"],
    "timing": ["quand", "when", "quando", "semer", "sow", "plant", "semin", "date", "moment", "wann"],
    "rotation": ["rotation", "rotazione", "culture", "coltura", "crop", "variété", "variete"],
    "irrigation": ["irrig", "riego", "arros"],
}
COPILOT = {
    "fr": {
        "ack": "Bonne question.",
        "risk": {"low": "Le risque de sécheresse est bas.", "moderate": "Le risque de sécheresse est modéré.", "high": "Le risque de sécheresse est élevé."},
        "the_crop": "ta culture",
        "water_head": "Côté eau : tu as {avail} mm disponibles et {crop} a besoin de {need} mm.",
        "w_enough": "C'est suffisant pour semer.",
        "w_risky": "C'est juste — réduis la densité ou choisis une culture moins gourmande.",
        "w_not": "Il manque {deficit} mm : mieux vaut attendre la pluie ou changer de culture.",
        "timing": {"plant_now": "Tu peux semer maintenant.", "wait": "Mieux vaut attendre.", "switch_crop": "Change plutôt de culture ou de rotation."},
        "timing_window": "Fenêtre conseillée : {window}.",
        "rotation": "La rotation la plus sûre ici : {rot0}. Elle économise l'eau et protège le sol.",
        "irrigation": "Sans irrigation, tout repose sur la pluie et l'humidité du sol. {wline} Le haricot ou le sorgho demandent moins d'eau que le maïs.",
        "tail": "(Données NASA : GPM, SMAP, MODIS, POWER. Estimation avec limites — valide avec ta coopérative.)",
        "limit": "Réponse de démonstration. Le vrai copilote (Claude API) sera branché par le flux 2.",
    },
    "en": {
        "ack": "Good question.",
        "risk": {"low": "Drought risk is low.", "moderate": "Drought risk is moderate.", "high": "Drought risk is high."},
        "the_crop": "your crop",
        "water_head": "On water: you have {avail} mm available and {crop} needs {need} mm.",
        "w_enough": "That's enough to plant.",
        "w_risky": "It's tight — lower density or pick a less thirsty crop.",
        "w_not": "You're short {deficit} mm: better wait for rain or switch crop.",
        "timing": {"plant_now": "You can plant now.", "wait": "Better wait.", "switch_crop": "Rather switch crop or rotation."},
        "timing_window": "Recommended window: {window}.",
        "rotation": "The safest rotation here: {rot0}. It saves water and protects the soil.",
        "irrigation": "Without irrigation, everything depends on rain and soil moisture. {wline} Beans or sorghum need less water than maize.",
        "tail": "(NASA data: GPM, SMAP, MODIS, POWER. Estimate with limits — confirm with your cooperative.)",
        "limit": "Demo answer. The real copilot (Claude API) will be wired by Flux 2.",
    },
    "it": {
        "ack": "Buona domanda.",
        "risk": {"low": "Il rischio di siccità è basso.", "moderate": "Il rischio di siccità è moderato.", "high": "Il rischio di siccità è alto."},
        "the_crop": "la tua coltura",
        "water_head": "Sull'acqua: hai {avail} mm disponibili e {crop} ha bisogno di {need} mm.",
        "w_enough": "È sufficiente per seminare.",
        "w_risky": "È al limite — riduci la densità o scegli una coltura meno esigente.",
        "w_not": "Mancano {deficit} mm: meglio aspettare la pioggia o cambiare coltura.",
        "timing": {"plant_now": "Puoi seminare ora.", "wait": "Meglio aspettare.", "switch_crop": "Meglio cambiare coltura o rotazione."},
        "timing_window": "Finestra consigliata: {window}.",
        "rotation": "La rotazione più sicura qui: {rot0}. Risparmia acqua e protegge il suolo.",
        "irrigation": "Senza irrigazione, tutto dipende da pioggia e umidità del suolo. {wline} Fagioli o sorgo richiedono meno acqua del mais.",
        "tail": "(Dati NASA: GPM, SMAP, MODIS, POWER. Stima con limiti — verifica con la cooperativa.)",
        "limit": "Risposta dimostrativa. Il vero copilota (Claude API) sarà collegato dal Flux 2.",
    },
}


def _topic(q: str) -> str:
    q = (q or "").lower()
    for topic, kws in INTENT_KW.items():
        if any(k in q for k in kws):
            return topic
    return "generic"


def copilot_answer(question: str, context: dict[str, Any] | None, lang: str = "fr") -> dict[str, Any]:
    lang = _L(lang)
    C = COPILOT[lang]
    ctx = context or {}
    wb = ctx.get("water_budget") or {}
    pt = ctx.get("planting_timeline") or {}
    rots = ctx.get("rotations") or []
    risk = ctx.get("risk_level", "moderate")
    status = wb.get("status", "risky")
    avail, need, deficit = wb.get("available_water_mm", "?"), wb.get("crop_water_need_mm", "?"), wb.get("deficit_mm", "?")

    wline = (C["w_enough"] if status == "enough_water"
             else C["w_risky"] if status == "risky"
             else C["w_not"].format(deficit=deficit))

    topic = _topic(question)
    parts = [C["ack"]]
    if topic == "water":
        parts += [C["water_head"].format(avail=avail, need=need, crop=C["the_crop"]), wline]
    elif topic == "timing":
        parts.append(C["timing"].get(pt.get("recommendation", "wait"), C["timing"]["wait"]))
        if pt.get("best_window"):
            parts.append(C["timing_window"].format(window=pt["best_window"]))
    elif topic == "rotation":
        parts.append(C["rotation"].format(rot0=rots[0]["name"] if rots else "—"))
    elif topic == "irrigation":
        parts.append(C["irrigation"].format(wline=wline))
    else:
        parts += [C["risk"].get(risk, C["risk"]["moderate"]), wline]
    parts.append(C["tail"])

    return {
        "answer": " ".join(parts),
        "sources": ["GPM IMERG", "SMAP", "MODIS/VIIRS", "NASA POWER"],
        "limitations": C["limit"],
        "_mock": True,
    }


# --- Backtesting (mock) : « l'outil aurait-il prévenu ? » ------------------
BT_SEASONS = [("2015–2016", "El Niño"), ("2018–2019", "—"), ("2019–2020", "—"), ("2023–2024", "El Niño")]
BT_TXT = {
    "fr": {
        "alert": {"low": "Pas d'alerte", "moderate": "Alerte modérée", "high": "Alerte sécheresse"},
        "warned": "Prévenu avant la fenêtre de semis",
        "missed": "Conditions normales",
        "summary": "Field Shift aurait prévenu lors de {n} saisons sèches sur {m} avant la fenêtre de semis.",
    },
    "en": {
        "alert": {"low": "No alert", "moderate": "Moderate alert", "high": "Drought alert"},
        "warned": "Warned before the planting window",
        "missed": "Normal conditions",
        "summary": "Field Shift would have warned in {n} of {m} dry seasons before the planting window.",
    },
    "it": {
        "alert": {"low": "Nessun allarme", "moderate": "Allarme moderato", "high": "Allarme siccità"},
        "warned": "Avvisato prima della finestra di semina",
        "missed": "Condizioni normali",
        "summary": "Field Shift avrebbe avvisato in {n} stagioni secche su {m} prima della finestra di semina.",
    },
}


def backtesting(payload: dict[str, Any]) -> dict[str, Any]:
    lang = _L(str(payload.get("lang", "fr")))
    T = BT_TXT[lang]
    lat = float(payload.get("latitude", 14.8))
    lon = float(payload.get("longitude", -90.5))
    base = _seed(lat, lon)

    seasons, warned = [], 0
    for i, (name, tag) in enumerate(BT_SEASONS):
        s = (base + i * 0.17) % 1.0
        el_nino = tag == "El Niño"
        rainfall_pct = round((45 if el_nino else 70) + s * 25)       # % du normal
        risk_score = int(max(5, min(98, (80 if el_nino else 45) + (0.7 - rainfall_pct / 100) * 60 - s * 15)))
        level = _risk_level(risk_score)
        did_warn = risk_score >= 50
        if did_warn:
            warned += 1
        seasons.append({
            "season": name, "tag": tag, "rainfall_pct": rainfall_pct,
            "risk_score": risk_score, "risk_level": level,
            "alert": T["alert"][level],
            "outcome": T["warned"] if did_warn else T["missed"],
            "warned": did_warn,
        })

    dry_total = sum(1 for x in seasons if x["risk_score"] >= 50 or x["tag"] == "El Niño")
    return {
        "seasons": seasons,
        "warned_count": warned,
        "total": len(seasons),
        "summary": T["summary"].format(n=warned, m=max(1, dry_total)),
        "_mock": True,
    }
