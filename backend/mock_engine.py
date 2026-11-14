"""Field Shift — Motor MOCK de recomendaciones (Flux 1).

Genera una recomendación plausible con el MISMO formato que el contrato de API
acordado (documento de equipo, sección 8.6). Esto permite al Flux 1 (front/PWA)
trabajar sin esperar el motor real de datos NASA + ML + IA del Flux 2.

Flux 2 reemplazará este módulo por el pipeline real (GPM, SMAP, MODIS, POWER,
GRACE-FO + reglas agronómicas + ML) manteniendo este formato de salida.
"""
from __future__ import annotations

import hashlib
import math
from datetime import date, timedelta
from typing import Any

# ---------------------------------------------------------------------------
# Datos agronómicos de demostración (valores aproximados por temporada, en mm).
# No son definitivos: el Flux 2 los validará con fuentes agronómicas fiables.
# ---------------------------------------------------------------------------
CROP_WATER_NEED_MM: dict[str, int] = {
    "maize": 520,       # maíz
    "beans": 350,       # frijol
    "sorghum": 400,     # sorgo (tolerante a sequía)
    "millet": 380,      # mijo
    "cover_crop": 300,  # cultivo de cobertura (mucuna, caupí)
}

CROP_LABELS_ES: dict[str, str] = {
    "maize": "Maíz",
    "beans": "Frijol",
    "sorghum": "Sorgo",
    "millet": "Mijo",
    "cover_crop": "Cultivo de cobertura",
}

# Capacidad de retención de agua del suelo (factor relativo).
SOIL_RETENTION: dict[str, float] = {
    "sandy": 0.55,       # arenoso: drena rápido, retiene poco
    "sandy_loam": 0.75,  # franco-arenoso
    "loam": 1.0,         # franco
    "clay_loam": 1.15,   # franco-arcilloso
    "clay": 1.25,        # arcilloso: retiene mucho
}


def _seed(latitude: float, longitude: float) -> float:
    """Genera un valor pseudo-aleatorio estable en [0,1) a partir de la posición.

    Así el mismo campo da siempre el mismo resultado (demo reproducible) sin
    depender de datos reales todavía.
    """
    key = f"{round(latitude, 3)}:{round(longitude, 3)}"
    digest = hashlib.sha256(key.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _risk_level(score: int) -> str:
    # Umbrales del documento: 0-39 bajo, 40-69 moderado, 70-100 alto.
    if score >= 70:
        return "high"
    if score >= 40:
        return "moderate"
    return "low"


def generate_recommendation(payload: dict[str, Any]) -> dict[str, Any]:
    """Construye la recomendación completa a partir de la entrada del front.

    Entrada esperada (contrato 8.6):
        latitude, longitude, crop, soil_type, irrigation (bool), priority
    """
    latitude = float(payload.get("latitude", 14.8))
    longitude = float(payload.get("longitude", -90.5))
    crop = str(payload.get("crop", "maize"))
    soil_type = str(payload.get("soil_type", "sandy_loam"))
    irrigation = bool(payload.get("irrigation", False))
    priority = str(payload.get("priority", "balanced"))

    s = _seed(latitude, longitude)

    # --- Indicadores NASA simulados -------------------------------------
    rainfall_normal = round(160 + s * 120)            # mediana histórica (mm)
    # Déficit influido por la posición: unos campos en plena sequía.
    rainfall_60d = round(rainfall_normal * (0.35 + s * 0.6))
    soil_moisture = round(0.08 + s * 0.22, 2)         # m3/m3 aprox (0-0.4)
    ndvi_trend = round(-0.20 + s * 0.28, 2)           # tendencia NDVI
    solar_radiation = round(18.0 + s * 8.0, 1)        # MJ/m2/día
    evapotranspiration = round(3.8 + s * 2.2, 1)      # mm/día

    # --- Presupuesto de agua --------------------------------------------
    retention = SOIL_RETENTION.get(soil_type, 1.0)
    expected_rain = round(rainfall_normal * (0.25 + s * 0.2))
    soil_contrib = round(soil_moisture * 1000 * retention * 0.4)
    irrigation_mm = 120 if irrigation else 0

    available_water = round(
        rainfall_60d * 0.6 + expected_rain + soil_contrib + irrigation_mm
    )
    crop_water_need = CROP_WATER_NEED_MM.get(crop, 450)
    # Ajuste por evapotranspiración / radiación (más calor => más demanda).
    crop_water_need = round(crop_water_need * (0.9 + evapotranspiration / 20))

    deficit = max(0, crop_water_need - available_water)
    coverage = min(1.0, available_water / crop_water_need)

    if deficit <= 0:
        water_status = "enough_water"
    elif deficit < 0.35 * crop_water_need:
        water_status = "risky"
    else:
        water_status = "not_enough_water"

    # --- Puntaje de riesgo (0-100) --------------------------------------
    deficit_component = (1 - coverage) * 55
    soil_component = (1.25 - retention) * 18       # suelo pobre => más riesgo
    ndvi_component = max(0, -ndvi_trend) * 60       # vegetación en declive
    irrigation_relief = -10 if irrigation else 0
    risk_score = int(
        max(0, min(100, 18 + deficit_component + soil_component
                   + ndvi_component + irrigation_relief))
    )
    risk_level = _risk_level(risk_score)

    # --- Línea de tiempo de siembra -------------------------------------
    today = date.today()
    window_start = today + timedelta(days=6)
    window_end = window_start + timedelta(days=10)
    if risk_level == "low":
        planting_reco = "plant_now"
        planting_reason = (
            "La humedad del suelo y la lluvia esperada cubren la necesidad del "
            "cultivo. Las condiciones son adecuadas para sembrar."
        )
    elif risk_level == "moderate":
        planting_reco = "wait"
        planting_reason = (
            "La humedad del suelo es limitada y la lluvia esperada aún es "
            "insuficiente. Conviene esperar a la próxima ventana de lluvia."
        )
    else:
        planting_reco = "switch_crop"
        planting_reason = (
            "El déficit de agua es alto para este cultivo. Considere un cultivo "
            "más resistente o una rotación que reduzca el riesgo."
        )

    # --- Rotaciones (3 planes) ------------------------------------------
    rotations = [
        {
            "type": "safest",
            "name": "Frijol → Sorgo → Cultivo de cobertura",
            "water_saving": "high",
            "soil_benefit": "high",
            "risk": "low",
            "reason": (
                "Reduce la dependencia del agua y mantiene el suelo cubierto. "
                "El sorgo tolera la sequía y el cultivo de cobertura protege el "
                "suelo entre temporadas."
            ),
        },
        {
            "type": "balanced",
            "name": "Leguminosa → Cereal → Cobertura/barbecho",
            "water_saving": "medium",
            "soil_benefit": "high",
            "risk": "moderate",
            "reason": (
                "Mantiene la producción y mejora la salud del suelo gracias a la "
                "rotación con leguminosas que fijan nitrógeno."
            ),
        },
        {
            "type": "highest_yield",
            "name": "Maíz (con alertas de riesgo hídrico)",
            "water_saving": "low",
            "soil_benefit": "medium",
            "risk": "high" if risk_level == "high" else "moderate",
            "reason": (
                "Maximiza el rendimiento cuando hay suficiente agua, pero exige "
                "vigilar de cerca la lluvia y la humedad del suelo."
            ),
        },
    ]

    # Ordena según la prioridad del agricultor.
    if priority == "save_water":
        rotations.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}[r["water_saving"]])
    elif priority == "max_yield":
        rotations.sort(key=lambda r: 0 if r["type"] == "highest_yield" else 1)

    # --- Explicación IA (mock / fallback) -------------------------------
    crop_es = CROP_LABELS_ES.get(crop, crop)
    status_es = {
        "enough_water": "suficiente agua",
        "risky": "agua en el límite",
        "not_enough_water": "agua insuficiente",
    }[water_status]
    ai_explanation = (
        f"Su campo presenta un riesgo de sequía {('bajo' if risk_level=='low' else 'moderado' if risk_level=='moderate' else 'alto')} "
        f"(puntaje {risk_score}/100). Para {crop_es}, la necesidad estimada es de "
        f"{crop_water_need} mm y el agua disponible es de {available_water} mm, es decir "
        f"{status_es}. "
        + (
            "Puede sembrar en la ventana recomendada." if planting_reco == "plant_now"
            else "Conviene esperar o considerar una rotación más resistente."
        )
        + " Fuentes NASA usadas: GPM IMERG (lluvia), SMAP (humedad), MODIS/VIIRS "
        "(NDVI) y NASA POWER (radiación y evapotranspiración)."
    )

    # --- Series temporales (8 semanas) para los gráficos del panel ----
    n = 8
    labels = [(today - timedelta(weeks=(n - 1 - i))).strftime("%d/%m")
              for i in range(n)]

    def _serie(base, amp, ndigits=2):
        vals = [round(base + math.sin(i * 0.8 + s * 6.283) * amp, ndigits)
                for i in range(n)]
        vals[-1] = round(base, ndigits)  # ancla el último al valor actual
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
            "explanation": (
                f"La lluvia y la humedad del suelo cubren alrededor del "
                f"{round(coverage * 100)}% de la necesidad estimada del cultivo."
            ),
        },
        "planting_timeline": {
            "recommendation": planting_reco,
            "best_window": f"{window_start.isoformat()} to {window_end.isoformat()}",
            "reason": planting_reason,
        },
        "rotations": rotations,
        "nasa_indicators": {
            "rainfall_60d_mm": rainfall_60d,
            "rainfall_normal_mm": rainfall_normal,
            "soil_moisture": soil_moisture,
            "ndvi_trend": ndvi_trend,
            "solar_radiation": solar_radiation,
            "evapotranspiration": evapotranspiration,
        },
        "ai_explanation": ai_explanation,
        "series": series,
        "_mock": True,  # bandera: datos simulados, los reemplazará el Flux 2
    }


def copilot_answer(question: str, context: dict[str, Any] | None) -> dict[str, Any]:
    """Respuesta MOCK del copiloto IA.

    El Flux 2 conectará aquí la Claude API con salvaguardas (no inventar datos,
    citar fuentes NASA, indicar límites). Mientras tanto devolvemos una
    explicación basada en la última recomendación calculada.
    """
    ctx = context or {}
    risk = ctx.get("risk_level", "moderate")
    wb = ctx.get("water_budget", {})
    status = wb.get("status", "risky")

    base = {
        "low": "El riesgo de sequía es bajo en su campo.",
        "moderate": "El riesgo de sequía es moderado: conviene actuar con prudencia.",
        "high": "El riesgo de sequía es alto en su campo.",
    }.get(risk, "El riesgo de sequía es moderado.")

    advice = {
        "enough_water": "Según los datos, hay suficiente agua para sembrar.",
        "risky": "El agua está en el límite; considere reducir la densidad o elegir un cultivo más resistente.",
        "not_enough_water": "No hay suficiente agua ahora; conviene esperar o cambiar de cultivo/rotación.",
    }.get(status, "")

    answer = (
        f"{base} {advice} "
        "Esta respuesta se basa en datos NASA (GPM, SMAP, MODIS, POWER) y en reglas "
        "agronómicas. Es una estimación con límites: valide siempre con su experiencia "
        "local y con su cooperativa."
    )

    return {
        "answer": answer,
        "sources": ["GPM IMERG", "SMAP", "MODIS/VIIRS", "NASA POWER"],
        "limitations": "Respuesta de demostración. El copiloto real (Claude API) lo integrará el Flux 2.",
        "_mock": True,
    }
