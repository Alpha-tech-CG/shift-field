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
        "_mock": True,
    }


# --- Copilote (mock) -------------------------------------------------------
COPILOT = {
    "fr": {
        "low": "Le risque de sécheresse est bas sur ton champ.",
        "moderate": "Le risque de sécheresse est modéré : agis avec prudence.",
        "high": "Le risque de sécheresse est élevé sur ton champ.",
        "enough_water": "D'après les données, il y a assez d'eau pour semer.",
        "risky": "L'eau est juste ; envisage de réduire la densité ou de choisir une culture plus résistante.",
        "not_enough_water": "Il n'y a pas assez d'eau maintenant ; mieux vaut attendre ou changer de culture/rotation.",
        "tail": "Cette réponse s'appuie sur les données NASA (GPM, SMAP, MODIS, POWER) et des règles agronomiques. C'est une estimation avec des limites : valide toujours avec ton expérience locale et ta coopérative.",
        "limit": "Réponse de démonstration. Le vrai copilote (Claude API) sera intégré par le Flux 2.",
    },
    "en": {
        "low": "Drought risk is low on your field.",
        "moderate": "Drought risk is moderate: act carefully.",
        "high": "Drought risk is high on your field.",
        "enough_water": "Based on the data, there is enough water to plant.",
        "risky": "Water is tight; consider lowering density or choosing a more resilient crop.",
        "not_enough_water": "There isn't enough water now; better wait or switch crop/rotation.",
        "tail": "This answer relies on NASA data (GPM, SMAP, MODIS, POWER) and agronomic rules. It is an estimate with limits: always check with your local experience and cooperative.",
        "limit": "Demo answer. The real copilot (Claude API) will be integrated by Flux 2.",
    },
    "it": {
        "low": "Il rischio di siccità è basso sul tuo campo.",
        "moderate": "Il rischio di siccità è moderato: agisci con prudenza.",
        "high": "Il rischio di siccità è alto sul tuo campo.",
        "enough_water": "Secondo i dati, c'è abbastanza acqua per seminare.",
        "risky": "L'acqua è al limite; valuta di ridurre la densità o scegliere una coltura più resistente.",
        "not_enough_water": "Non c'è abbastanza acqua ora; meglio aspettare o cambiare coltura/rotazione.",
        "tail": "Questa risposta si basa su dati NASA (GPM, SMAP, MODIS, POWER) e regole agronomiche. È una stima con dei limiti: verifica sempre con la tua esperienza locale e la cooperativa.",
        "limit": "Risposta dimostrativa. Il vero copilota (Claude API) sarà integrato dal Flux 2.",
    },
}


def copilot_answer(question: str, context: dict[str, Any] | None, lang: str = "fr") -> dict[str, Any]:
    lang = _L(lang)
    C = COPILOT[lang]
    ctx = context or {}
    risk = ctx.get("risk_level", "moderate")
    status = (ctx.get("water_budget") or {}).get("status", "risky")
    answer = f"{C.get(risk, C['moderate'])} {C.get(status, '')} {C['tail']}"
    return {
        "answer": answer,
        "sources": ["GPM IMERG", "SMAP", "MODIS/VIIRS", "NASA POWER"],
        "limitations": C["limit"],
        "_mock": True,
    }
