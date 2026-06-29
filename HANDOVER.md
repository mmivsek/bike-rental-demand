# Handover — Washington D.C. Bike Rental Demand Predictor
Last updated: 2026-06-29

---

## What this project is

A full-stack web app that predicts hourly bike rental demand for Washington D.C.'s Capital Bikeshare system. Built for a university data analytics course. Trained on the UCI Bike Sharing Dataset (2011–2012, 17,379 rows). Two XGBoost models: one classifier (demand_high 0/1) and one regressor (cnt bikes/hr).

---

## Live URLs

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://bike-rental-demand.vercel.app *(or check Vercel dashboard)* |
| **Backend (Render)** | https://bike-rental-demand.onrender.com |
| **GitHub repo** | https://github.com/mmivsek/bike-rental-demand |

> Render free tier sleeps after 15 min idle → first prediction takes ~30s cold start.

---

## Local development

```
Project root: C:\Users\matej\Desktop\MADA_VIBE_CODING\bike_rental
```

**Start frontend:**
```
cd frontend
npm run dev        # runs on localhost:5173 or 5174
```

**Start backend:**
```
cd api
uvicorn main:app --reload --port 8000
```

**Regenerate science-data.json** (if models change):
```
python generate_science_data.py
```

**Retrain models** (if features change):
```
python train_save_models.py
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite, Recharts, react-datepicker, react-leaflet |
| Backend | FastAPI 0.115, uvicorn, Python 3.11 |
| ML | scikit-learn 1.9.0, XGBoost 3.2.0, pandas 2.2.3, numpy 1.26.4 |
| Live weather | Open-Meteo API (no key needed) |
| Frontend hosting | Vercel — auto-deploys on `git push` to master |
| Backend hosting | Render.com — auto-deploys on `git push` to master |

---

## Deployment: how it works

1. Edit code locally
2. `git push origin master`
3. Vercel picks it up → runs `cd frontend && npm run build` → deploys in ~30s
4. Render picks it up → runs `pip install -r api/requirements.txt` → restarts uvicorn in ~90s

**Vercel env var required:** `VITE_API_URL = https://bike-rental-demand.onrender.com`
(set in Vercel project settings → Environment Variables — baked into JS bundle at build time)

**Python version pin:** `.python-version` file contains `3.11.9` — forces Render to use Python 3.11 which has pre-built wheels for all packages. Without this, Render defaults to Python 3.14 and compiles pandas/numpy from source (8+ min).

**Model version matching:** `api/requirements.txt` pins `scikit-learn==1.9.0` and `xgboost==3.2.0` — must match what the models were trained with. Mismatch causes `InconsistentVersionWarning` and silent wrong predictions (zeros).

---

## Pages in the app

| Tab | File | Description |
|-----|------|-------------|
| Predictor | `frontend/src/pages/Predictor.jsx` | Main page — date picker, weather sliders, 24hr chart, deviation explainer, multi-scenario comparison |
| Leaderboard | `frontend/src/pages/Leaderboard.jsx` | Top/bottom hours table |
| Demand Patterns | `frontend/src/pages/Charts.jsx` | Hourly, monthly, seasonal, weekday charts |
| ML & Science | `frontend/src/pages/Science.jsx` | sklearn API, train/test split, dummy baseline, data leakage, feature importance, model comparison, scatter, residuals |
| Architecture | `frontend/src/pages/Architecture.jsx` | System diagram, tech stack, key files, engineering decisions, deployment workflow |
| About the Data | `frontend/src/pages/About.jsx` | Dataset background, column reference, station map |

---

## Key files

| File | Lines | Purpose |
|------|-------|---------|
| `train_save_models.py` | 147 | Offline training — fits both pipelines, saves `models/classifier.pkl`, `models/regressor.pkl`, `models/metadata.json` |
| `api/main.py` | 169 | FastAPI — `/predict` (single hour), `/predict-day` (24 hours), `/` (health check) |
| `generate_science_data.py` | 180 | Extracts feature importances, correlations, stats → `frontend/public/science-data.json` |
| `frontend/src/pages/Predictor.jsx` | 771 | Biggest file — predictor, day chart, deviation explainer, comparison scenarios |
| `frontend/src/pages/Science.jsx` | 770 | Full ML explainability page with code blocks |
| `frontend/src/index.css` | 700 | Single CSS file — all design tokens and components |
| `frontend/public/science-data.json` | 29 KB | Pre-computed ML data for Science and Predictor pages |
| `frontend/public/chart-data.json` | — | Hourly baseline averages (workday/weekend) for the day forecast chart |

---

## ML model details

| | Classifier | Regressor |
|--|-----------|----------|
| Target | `demand_high` (0 or 1) | `cnt` (bikes/hr, 1–977) |
| Threshold | cnt > 142 (median) | — |
| Algorithm | XGBClassifier | XGBRegressor |
| Trees | 200 | 400 |
| Max depth | 6 | 6 |
| Learning rate | 0.10 | 0.05 |
| Subsample | 0.80 | 0.80 |
| Test accuracy | 95.1 % | R² = 0.955 |
| Test AUC | 0.989 | MAE = 22.8 bikes/hr |

**Feature pipeline:**
- 17,379 rows → 85/15 split → 14,772 train / 2,607 test (random_state=42)
- Feature selection: Lasso (α=0.5) + Pearson |r| ≥ 0.05 on train split only
- All 23 engineered features survived both filters
- Both models wrapped in `sklearn.pipeline.Pipeline([("sc", StandardScaler()), ("model", XGB...)])`
- Models saved with pickle, committed to GitHub, loaded by FastAPI at startup

**23 features:** hr, hr_sin, hr_cos, mnth, mnth_sin, mnth_cos, weekday, weekday_cos, season, yr, weathersit, temp, hum, windspeed, bad_weather, rush_hour, is_night, is_weekend, peak_season, holiday, rush_workday, temp_workday, comfort

---

## Predictor page: key features

- **Date picker** — colour-coded: green = historical (2011-2012), blue = forecast (≤16 days ahead), grey = no data
- **Weather info panel** — auto-fetches Open-Meteo for selected date+hour; shows historical/current/forecast badge
- **24-hour forecast chart** — uses `/predict-day` endpoint; dashed grey = historical average; red = model prediction
- **Multi-scenario comparison** — up to 3 lines on chart; "+ Add comparison" button clones current weather inputs
- **Deviation explainer** (💡 panel, below chart) — appears after clicking Predict; explains top 4 drivers of deviation from the dataset average (189.5 bikes/hr) using XGBoost importance × z-score × corr_cnt sign
- **5-level demand scale** — Very Low / Low / Moderate / High / Very High with colour coding
- **Staleness indicator** — turns amber with pulse when inputs changed since last prediction
- **Live dual-city clock** — Ljubljana (🇸🇮) and Washington D.C. (🇺🇸)

---

## 💡 Deviation explainer — how it works

Appears below the day chart after predicting. Ranks top 4 factors by:

```
contribution = ((user_value - dataset_mean) / dataset_std) × feature_importance × sign(corr_cnt)
```

The `sign(corr_cnt)` correction ensures direction is intuitive:
- Clear weather (weathersit=1, below mean=1.4) → negative z-score × negative corr → positive score → ↑
- Rain (weathersit=3, above mean) → positive z-score × negative corr → negative score → ↓

Data source: `science-data.json` contains `feature_stats` (mean/std per feature) and `avg_cnt` (189.5).

---

## Recent git commits (this session)

```
01e46f0  feat: add Architecture page
ea5ea78  feat: add deviation explainer + expand ML & Science page
344d96a  fix: match sklearn and xgboost versions to what models were trained with
b11ba5d  fix: pin Python 3.11 for Render to get pre-built wheels
8dd4c37  fix: add fastapi/uvicorn to root requirements.txt for Render
15818fe  chore: add Render deployment config for FastAPI backend
ca0ec3c  chore: add Vercel deployment config
873eaf7  feat: add multi-scenario comparison to day forecast chart
00d69a7  feat: add prediction staleness indicator to Predictor
3fa9571  feat: add live dual-city clock (Ljubljana + Washington D.C.)
064a3a5  feat: replace binary demand label with 5-level demand scale
9fa998e  feat: add 24-hour demand forecast chart to Predictor page
371566b  feat: add ML & Science page with full model explanation
```

---

## Known issues / gotchas

- **Render cold start** — free tier sleeps after 15 min; first prediction after idle takes ~30s. Nothing to fix, just inform the user.
- **Year feature** — models were trained on 2011–2012 data. Any date after 2012 is treated as 2012 for the `yr` binary feature. Predictions still work but reflect 2012 fleet size, not current.
- **Deviation explainer accuracy** — the explainer uses a proxy formula (feature importance × z-score), not true SHAP values. It is directionally correct but not mathematically exact. Noted in the UI footnote.
- **science-data.json must be regenerated** if models are retrained. Run `python generate_science_data.py` from the project root.

---

## Assignment deliverables (completed)

- `architecture_submission.html` — self-contained HTML with base64 PNG, Mermaid source, and written explanation for course submission
- `architecture.md` — Mermaid diagram source + written explanation
- Both updated to include Render + Vercel in the Runtime zone

---

## How to hand this context to a new Claude session

Paste this file content at the start of the conversation, or say:
> "Read HANDOVER.md in the project root and continue from there."
