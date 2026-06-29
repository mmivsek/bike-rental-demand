"""FastAPI backend for the D.C. Bike Rental demand predictor."""

import json
import os
import pickle
from datetime import date as _date

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Bike Rental Demand API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Model loading ─────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(BASE, "models")

with open(os.path.join(MODELS, "classifier.pkl"), "rb") as f:
    clf = pickle.load(f)
with open(os.path.join(MODELS, "regressor.pkl"), "rb") as f:
    reg = pickle.load(f)
with open(os.path.join(MODELS, "metadata.json")) as f:
    meta = json.load(f)

FEATS = meta["feature_names"]


# ── Feature engineering ───────────────────────────────────────────────────────
def _month_to_season(month: int) -> int:
    return {3: 1, 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 4, 1: 4, 2: 4}[month]


def build_feature_row(
    year: int, month: int, day: int, hr: int,
    weathersit: int, temp_c: float, hum_pct: float, wind_kmh: float
) -> pd.DataFrame:
    season = _month_to_season(month)
    d = _date(year, month, day)
    weekday = d.weekday()  # Monday=0
    workingday = int(weekday < 5)
    yr = min(1, year - 2011)

    temp = temp_c / 41.0
    hum = hum_pct / 100.0
    windspeed = (wind_kmh / 1.609) / 67.0

    hr_sin = np.sin(2 * np.pi * hr / 24)
    hr_cos = np.cos(2 * np.pi * hr / 24)
    mnth_sin = np.sin(2 * np.pi * month / 12)
    mnth_cos = np.cos(2 * np.pi * month / 12)
    weekday_cos = np.cos(2 * np.pi * weekday / 7)

    rush_hour = int(hr in {7, 8, 17, 18})
    is_night = int(hr < 6 or hr > 22)
    is_weekend = int(weekday >= 5)
    peak_season = int(season in {2, 3})
    bad_weather = int(weathersit == 3)
    rush_workday = rush_hour * workingday
    temp_workday = temp * workingday
    comfort = temp * (1 - hum) * (1 - windspeed)

    row = {
        "bad_weather": bad_weather,
        "comfort": comfort,
        "holiday": 0,
        "hr": hr,
        "hr_cos": hr_cos,
        "hr_sin": hr_sin,
        "hum": hum,
        "is_night": is_night,
        "is_weekend": is_weekend,
        "mnth": month,
        "mnth_cos": mnth_cos,
        "mnth_sin": mnth_sin,
        "peak_season": peak_season,
        "rush_hour": rush_hour,
        "rush_workday": rush_workday,
        "season": season,
        "temp": temp,
        "temp_workday": temp_workday,
        "weathersit": weathersit,
        "weekday": weekday,
        "weekday_cos": weekday_cos,
        "windspeed": windspeed,
        "yr": yr,
    }
    return pd.DataFrame([row])[FEATS]


# ── Schemas ───────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    year: int
    month: int
    day: int
    hr: int
    weathersit: int = 1
    temp_c: float = 20.0
    hum_pct: float = 60.0
    wind_kmh: float = 15.0


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "features": len(FEATS)}


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        X = build_feature_row(
            req.year, req.month, req.day, req.hr,
            req.weathersit, req.temp_c, req.hum_pct, req.wind_kmh,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    demand_class = int(clf.predict(X)[0])
    demand_prob = float(clf.predict_proba(X)[0][1])
    rental_count = max(0, int(reg.predict(X)[0]))

    d = _date(req.year, req.month, req.day)
    season = _month_to_season(req.month)
    weekday = d.weekday()

    return {
        "demand_class": demand_class,
        "demand_prob": round(demand_prob, 4),
        "rental_count": rental_count,
        "season": season,
        "weekday": weekday,
        "is_rush": req.hr in {7, 8, 17, 18},
        "is_workday": weekday < 5,
    }
