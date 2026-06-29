---
title: "feat: Streamlit Bike Rental Prediction App"
date: 2026-06-29
type: feat
depth: Standard
---

## Summary

Build a three-tab Streamlit app (`app.py`) that serves the trained XGBoost models as a live prediction interface. Users enter date/time and weather conditions; the app replicates the training-time feature engineering pipeline to produce the 23-feature vector, runs both models, and returns a demand class (HIGH/LOW with probability) and an estimated hourly rental count. A second tab shows the test-set leaderboard from the analysis, and a third shows demand-pattern charts.

## Problem Frame

The project (D2 deliverable) requires a deployed web app using the trained models. The `.pkl` files and `models/metadata.json` are already saved. The primary risk is **inference-time feature mismatch** — the app must replicate the exact transforms applied during training (cyclical encoding, boolean flags, interaction terms) or predictions will be silently wrong.

---

## Requirements

- R1: Users can enter hour, day, month, season, holiday/workday status, and weather (temp, humidity, windspeed) and receive a demand prediction.
- R2: The app shows both the classification output (HIGH/LOW + probability) and the regression output (rental count ± MAE).
- R3: Feature engineering at inference exactly matches training: cyclical sin/cos for hr/mnth/weekday, plus `rush_hour`, `is_night`, `is_weekend`, `peak_season`, `bad_weather`, `rush_workday`, `temp_workday`, `comfort`. Feature column order matches `models/metadata.json: feature_names`.
- R4: Models are cached (`@st.cache_resource`) so they load once per session.
- R5: Leaderboard tab shows the test-set metrics from Part E (hardcoded from `analysis.qmd`).
- R6: Charts tab shows 2–3 pre-generated demand-pattern plots (hour-of-day, season, weather impact).
- R7: App runs with `streamlit run app.py` from a clean install of `requirements_app.txt`.
- R8: Input values are in natural units (°C, %, km/h); normalization to the UCI 0–1 scale happens internally before prediction.

---

## Key Technical Decisions

**KTD-1: Feature engineering lives in `app.py`, not a separate module.**
For a course deliverable with ~250 lines total, inlining `build_feature_row()` avoids import complexity and keeps the app self-contained. If the app grows, extract to `utils/features.py`.

**KTD-2: Weather inputs use natural units; app normalizes internally.**
UCI normalization: `temp_norm = temp_celsius / 41`, `hum_norm = hum_pct / 100`, `windspeed_norm = (windspeed_kmh / 1.609) / 67`. Displaying raw 0–1 sliders would confuse a non-technical user; accepting real-world units and converting is the right UX choice.

**KTD-3: Weekday derived from selected date, not a separate input.**
User picks a date with `st.date_input`. Weekday (0=Mon … 6=Sun) is computed from that date. This eliminates a redundant input and prevents inconsistent date/weekday combinations.

**KTD-4: Leaderboard is hardcoded from analysis.qmd Part E, not re-computed.**
Re-training in the app would be slow and unnecessary. The test numbers are fixed facts from the analysis; they belong in a constant dict, not a live call.

**KTD-5: Charts are `matplotlib` figures rendered with `st.pyplot`, pre-generated from the engineered CSV at startup.**
No interactive Plotly dependency needed; matplotlib matches the analysis report style and avoids an extra package.

---

## Scope Boundaries

### In scope
- Single-file Streamlit app (`app.py`) with three tabs: Predictor, Leaderboard, Charts.
- `requirements_app.txt` for clean-install deployment.
- Inference-time feature engineering replicating training transforms.
- Model loading from `models/` with caching.

### Out of scope
- OpenWeatherMap API integration (nice-to-have; user can enter weather manually).
- React frontend.
- Quarto slides (D4) or executive summary (D3/D5) — separate deliverables.
- User authentication or persistent session history.

### Deferred to Follow-Up Work
- Live weather fetch via OpenWeatherMap API (optional enhancement after app ships).
- Deployment to share.streamlit.io (one-click after app works locally).

---

## High-Level Technical Design

```
User Input (Streamlit widgets)
    │
    ▼
build_feature_row()          ← replicates training-time transforms
    │  • weekday from date
    │  • cyclical sin/cos (hr, mnth, weekday)
    │  • boolean flags (rush_hour, is_night, is_weekend, etc.)
    │  • interaction terms (rush_workday, comfort, temp_workday)
    │  • normalize temp/hum/wind to UCI 0-1 scale
    │
    ▼
pd.DataFrame row ordered by metadata["feature_names"]
    │
    ├─► clf_pipeline.predict() + predict_proba()   → HIGH/LOW + confidence
    └─► reg_pipeline.predict()                     → rental count
    │
    ▼
Prediction display (col layout: badge + count metric)
```

Tab flow:

| Tab | Content |
|-----|---------|
| Predictor | Input widgets (left col) + prediction result (right col) |
| Leaderboard | Two static `st.dataframe` tables: classification + regression |
| Charts | 3 `st.pyplot` figures: hourly pattern, seasonal pattern, weather impact |

---

## Output Structure

```
bike_rental/
  app.py                  ← single Streamlit entry point
  requirements_app.txt    ← streamlit + runtime deps (no dev/test extras)
  models/
    classifier.pkl        ← already exists
    regressor.pkl         ← already exists
    metadata.json         ← feature_names list + demand threshold
  dataset/
    hour_engineered.csv   ← used for chart pre-generation
```

---

## Implementation Units

### U1. Model loading and feature engineering helpers

**Goal:** Define `load_models()` (cached) and `build_feature_row()` at the top of `app.py`. These are the two correctness-critical functions.

**Requirements:** R3, R4, R8

**Dependencies:** none

**Files:**
- `app.py` (create)

**Approach:**
- `load_models()` decorated with `@st.cache_resource`: opens `models/classifier.pkl`, `models/regressor.pkl`, `models/metadata.json` and returns the three objects.
- `build_feature_row(date, hr, season, holiday, weathersit, temp_c, hum_pct, wind_kmh)` → `pd.DataFrame`:
  - Compute `yr` from date (2011=0, else 1; for live use, clamp to 1 since 2012 is the last year in training)
  - Compute `mnth` from date
  - Compute `weekday` (Monday=0) from date
  - Compute `workingday` (1 if not holiday and weekday < 5)
  - Normalize: `temp = temp_c / 41`, `hum = hum_pct / 100`, `windspeed = (wind_kmh / 1.609) / 67`
  - Cyclical encoding: `hr_sin`, `hr_cos`, `mnth_sin`, `mnth_cos`, `weekday_sin`, `weekday_cos`
  - Boolean flags: `rush_hour = int(hr in {7,8,17,18})`, `is_night = int(hr < 6 or hr > 22)`, `is_weekend = int(weekday >= 5)`, `peak_season = int(season in {2,3})`, `bad_weather = int(weathersit == 3)`
  - Interaction terms: `rush_workday = rush_hour * workingday`, `temp_workday = temp * workingday`, `comfort = temp * (1 - hum) * (1 - windspeed)`
  - Assemble all raw + engineered features into a dict, return as single-row DataFrame with columns ordered exactly as `metadata["feature_names"]`.

**Patterns to follow:** `train_save_models.py` feature derivation logic; `dataset/hour_engineered.csv` column names as reference.

**Test scenarios:**
- `build_feature_row` for Tuesday 8am, July, season=3, no holiday, clear, temp=22°C, hum=55%, wind=20km/h` → `rush_hour=1`, `rush_workday=1`, `comfort ≈ 0.44`, all 23 features present with no NaN
- `build_feature_row` for Saturday 2am, winter` → `is_weekend=1`, `is_night=1`, `rush_hour=0`, `rush_workday=0`
- `build_feature_row` returns a DataFrame whose columns match `metadata["feature_names"]` exactly (order included)

**Verification:** Run `python -c "import app; ..."` and assert no KeyError and no NaN on the test cases above.

---

### U2. Predictor tab

**Goal:** Build the main prediction UI — left column for inputs, right column for results.

**Requirements:** R1, R2, R3, R8

**Dependencies:** U1

**Files:**
- `app.py` (extend)

**Approach:**
- `st.date_input` for date, `st.slider` for hour (0–23).
- `st.selectbox` for season (Spring/Summer/Autumn/Winter mapped to 1–4).
- `st.checkbox` for holiday.
- `st.selectbox` for weather (Clear/Cloudy/Light Rain/Heavy Rain mapped to 1–3, with 4 folded to 3 per data cleaning).
- `st.slider` for temp (−5 to 40 °C), humidity (0–100 %), wind speed (0–80 km/h). Show real-world units in labels.
- On button click (or live update with `st.form`): call `build_feature_row()` → predict → display.
- Right column: large colored badge for HIGH (green) / LOW (orange) with probability bar (`st.progress`); metric for rental count with delta showing MAE as "±38 typical error".
- Add `st.caption` below results noting: "Model trained on 2011–2012 D.C. data. Predictions may not reflect current conditions."

**Patterns to follow:** Streamlit two-column layout (`col1, col2 = st.columns([1, 1])`).

**Test scenarios:**
- Submitting Tuesday 8am, summer, no holiday, clear, 22°C, 55%, 20km/h → prediction renders without error, demand class is HIGH, count > 0
- Submitting Saturday 3am, winter, heavy rain → LOW demand, count < 100
- Changing any input and re-submitting updates the displayed result

**Verification:** `streamlit run app.py` renders the tab; manual spot checks match back-of-envelope expectations.

---

### U3. Leaderboard tab

**Goal:** Display the test-set performance tables for both tasks, matching Part E of `analysis.qmd`.

**Requirements:** R5

**Dependencies:** U1 (for app shell)

**Files:**
- `app.py` (extend)

**Approach:**
- Hardcode the leaderboard dicts from Part E results:
  - Classification: Dummy, Logistic Regression, Decision Tree (d=11), XGBoost — columns: Model, Test Acc, Precision, Recall, F1, ROC-AUC
  - Regression: Dummy, Ridge, Decision Tree (d=12), XGBoost — columns: Model, Test R², Test MAE, Test RMSE
- Render with `st.dataframe(..., hide_index=True)`, highlight the XGBoost row.
- Add a short interpretive caption below each table (1–2 sentences from the business interpretation section).

**Patterns to follow:** Part E leaderboard tables from `analysis.qmd` sections 21.2 and 22.2.

**Test scenarios:**
- Tab renders without error
- XGBoost rows show acc=0.951 and R²=0.955
- Both tables are visible and correctly labeled

**Verification:** Visual check in browser after `streamlit run app.py`.

---

### U4. Charts tab

**Goal:** Show 3 static demand-pattern figures generated from the engineered dataset.

**Requirements:** R6

**Dependencies:** U1

**Files:**
- `app.py` (extend)

**Approach:**
- Load `dataset/hour_engineered.csv` with `@st.cache_data`.
- Figure 1: Mean rental count by hour (line chart, grouped by workingday). Shows the commuter double-peak vs. leisure midday peak.
- Figure 2: Box plot of `cnt` by season. Shows clear seasonality.
- Figure 3: Mean `cnt` by `weathersit` (bar chart). Shows weather impact.
- Each figure rendered with `st.pyplot(fig)`, followed by a one-sentence caption.
- Use `plt.close(fig)` after each `st.pyplot` to prevent matplotlib memory leaks.

**Test scenarios:**
- Tab renders 3 figures without error
- Hour chart shows a recognizable double-peak on workingdays
- Charts load in under 3 seconds (data is cached)

**Verification:** Visual check in browser.

---

### U5. Requirements file and app wiring

**Goal:** Wire the three tabs into one `app.py`, add `requirements_app.txt`, and confirm clean-install run.

**Requirements:** R7

**Dependencies:** U2, U3, U4

**Files:**
- `app.py` (finalize — add tab container, page config, title)
- `requirements_app.txt` (create)

**Approach:**
- `st.set_page_config(page_title="Bike Rental Demand", page_icon="🚲", layout="wide")` at top.
- `tab1, tab2, tab3 = st.tabs(["🔮 Predictor", "📊 Leaderboard", "📈 Demand Patterns"])`.
- `requirements_app.txt` pins the same versions as `requirements.txt` plus `streamlit>=1.35`.
- Verify: `pip install -r requirements_app.txt && streamlit run app.py` opens without error.

**Test scenarios:**
- Fresh venv install + `streamlit run app.py` opens with no import errors
- All three tabs are clickable and render their content
- No `DeprecationWarning` from xgboost or sklearn on model load

**Verification:** End-to-end smoke test in a fresh terminal.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|-----------|
| Inference feature mismatch (wrong order or missing column) | `build_feature_row` returns columns in `metadata["feature_names"]` order; add assertion before predict |
| `plt.show()` called inside Streamlit (opens a window instead of rendering in-app) | Always use `st.pyplot(fig)` and `plt.close(fig)` — never `plt.show()` |
| Model pkl version mismatch (sklearn/xgboost version differs in deploy env) | Pin exact versions in `requirements_app.txt` matching the training environment |
| Date-derived `yr` feature: any date after 2012 maps to `yr=1` | Clamp `yr = min(1, year - 2011)` with a UI note that the model was trained on 2011–2012 data |

---

## Sources & Research

- UCI Bike Sharing Dataset documentation (normalization formulas for temp, hum, windspeed)
- `models/metadata.json` — authoritative feature list and demand threshold
- `train_save_models.py` — feature derivation logic to replicate at inference
- `dataset/hour_engineered.csv` — column reference for engineered feature names
- Streamlit docs: `st.cache_resource` for model loading, `st.tabs` for tab navigation
