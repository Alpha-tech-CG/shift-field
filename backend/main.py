"""Field Shift — Application FastAPI.

Flux 1 (Zlat) : la PWA + l'API mock.  Flux 2 (ML/IA) : le VRAI moteur.

Ce fichier sert la PWA (fichiers statiques du front) et expose l'API que
consomme le front, au format du contrat §8.6. Les routes pointent désormais sur
`real_engine` (NASA POWER + modèle ML + copilote Gemini). `real_engine` retombe
tout seul sur `mock_engine` en cas de problème, donc la démo ne casse jamais.

Exécuter :
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
Puis ouvrir : http://127.0.0.1:8000/
(Pour le copilote IA en direct : mettre GEMINI_API_KEY dans backend/.env —
sans clé, les réponses restent utiles via le fallback déterministe.)
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Charge backend/.env (clé Gemini) si présent — no-op sinon.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass

import real_engine as engine

FRONTEND_DIR = (Path(__file__).resolve().parent.parent / "frontend")

app = FastAPI(
    title="Field Shift API",
    description="Décisions de siembra ante la sequía a partir de datos NASA (NASA POWER + ML + IA).",
    version="1.0.0-flux2",
)

# CORS ouvert en développement (front et back peuvent tourner séparément).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "field-shift", "mode": "real"}


@app.post("/api/recommendation")
async def recommendation(payload: dict) -> JSONResponse:
    """Recommandation complète pour un champ (contrat §8.6, données réelles)."""
    return JSONResponse(engine.generate_recommendation(payload or {}))


@app.post("/api/backtesting")
async def backtest(payload: dict) -> JSONResponse:
    """Backtesting : « l'outil aurait-il prévenu ? » sur les saisons sèches passées."""
    return JSONResponse(engine.backtesting(payload or {}))


@app.post("/api/copilot")
async def copilot(payload: dict) -> JSONResponse:
    """Copilote IA (Gemini). Entrée : {question, context, lang}."""
    payload = payload or {}
    return JSONResponse(engine.copilot_answer(
        question=str(payload.get("question", "")),
        context=payload.get("context"),
        lang=str(payload.get("lang", "fr")),
    ))


# IMPORTANT : monter les statiques en dernier, pour ne pas masquer les routes /api.
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
