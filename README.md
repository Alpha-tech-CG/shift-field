# Field Shift 🌱

**Decide qué sembrar antes de la sequía, no después.**

PWA de apoyo a la decisión para agricultores: convierte datos NASA en una
decisión práctica de siembra.

> NASA data → Presupuesto de agua → Línea de siembra → Plan de rotación

NASA Space Apps Challenge · Reto *Field Shift — Adapting Farms with NASA Data*.
Región piloto: Corredor Seco Centroamericano (Guatemala, Honduras, Nicaragua).

---

## Estado actual (MVP — Flux 1: Producto / Full-Stack)

Este repositorio contiene el **volet Producto / Full-Stack** (Zlat): la PWA
completa + un backend FastAPI que la sirve y expone la API **con datos MOCK**.

El **Flux 2 (Datos / ML / IA)** reemplazará el motor mock por el pipeline real
(conectores NASA GPM/SMAP/MODIS/POWER/GRACE-FO + indicadores + ML + copiloto
Claude) **sin cambiar el formato de la API** (contrato sección 8.6).

### Ya funciona
- Páginas: Inicio, Campo (mapa Leaflet), Perfil, Panel, Copiloto, Cooperativa.
- Puntaje de riesgo, presupuesto de agua, línea de siembra, 3 rotaciones.
- Gráficos (Chart.js) e indicadores NASA.
- Copiloto IA (respuesta mock) y tarjeta de cooperativa imprimible con QR.
- Interfaz **en español** (con cambio a inglés).
- PWA: manifiesto + service worker + modo sin conexión.

---

## Cómo ejecutar

Requisitos: Python 3.10+.

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Abrir: <http://127.0.0.1:8000/>

El backend sirve el front y la API en el mismo origen, así que no hay que
configurar nada más.

---

## Estructura

```
field-shift/
├── backend/
│   ├── main.py          # FastAPI: sirve el front + API
│   ├── mock_engine.py   # motor MOCK (lo reemplaza el Flux 2)
│   └── requirements.txt
└── frontend/
    ├── index.html  campo.html  perfil.html
    ├── panel.html  copiloto.html  cooperativa.html
    ├── css/app.css
    ├── js/          # i18n, store, api, pwa + lógica por página
    ├── icons/icon.svg
    ├── manifest.webmanifest
    └── sw.js
```

---

## Contrato de API (frontend ↔ Flux 2)

**No cambiar sin avisar al equipo** (regla de colaboración del documento).

`POST /api/recommendation`

Entrada:
```json
{ "latitude": 14.8, "longitude": -90.5, "crop": "maize",
  "soil_type": "sandy_loam", "irrigation": false, "priority": "save_water" }
```

Salida: ver `backend/mock_engine.py` → `generate_recommendation()`
(`risk_score`, `risk_level`, `water_budget`, `planting_timeline`, `rotations`,
`nasa_indicators`, `ai_explanation`). Incluye `"_mock": true` mientras sean
datos simulados.

`POST /api/copilot` → `{ question, context }` → `{ answer, sources, limitations }`.

---

## Reparto del trabajo

| Flux | Persona | Alcance |
|---|---|---|
| **1** | Producto / Full-Stack | PWA, páginas, mapa, gráficos, integración front↔API, demo |
| **2** | Datos / ML / IA | Conectores NASA, indicadores, motores de riesgo/agua/siembra/rotación, ML, copiloto IA, backtesting |

El límite entre ambos es el **contrato de API** de arriba.
