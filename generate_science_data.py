"""
Extract ML science data for the frontend Science page.
Outputs: frontend/public/science-data.json
"""
import json, pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import Lasso
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, roc_auc_score, mean_absolute_error,
    r2_score, mean_squared_error
)

RANDOM_STATE = 42
DEMAND_THRESHOLD = 142

# ── Load models ───────────────────────────────────────────────────────────────
with open("models/classifier.pkl", "rb") as f:
    clf_pipe = pickle.load(f)
with open("models/regressor.pkl", "rb") as f:
    reg_pipe = pickle.load(f)
with open("models/metadata.json") as f:
    meta = json.load(f)

FINAL_FEATURES = meta["feature_names"]

# ── Load data ─────────────────────────────────────────────────────────────────
df = pd.read_csv("dataset/hour_engineered.csv")
X = df[FINAL_FEATURES]
y_reg = df["cnt"]
y_clf = df["demand_high"]

X_train, X_test, y_clf_train, y_clf_test = train_test_split(
    X, y_clf, test_size=0.15, random_state=RANDOM_STATE
)
_, _, y_reg_train, y_reg_test = train_test_split(
    X, y_reg, test_size=0.15, random_state=RANDOM_STATE
)

# ── Feature importances ───────────────────────────────────────────────────────
clf_model = clf_pipe.named_steps["model"]
reg_model = reg_pipe.named_steps["model"]

clf_imp = dict(zip(FINAL_FEATURES, clf_model.feature_importances_.tolist()))
reg_imp = dict(zip(FINAL_FEATURES, reg_model.feature_importances_.tolist()))

# Sort descending
clf_imp_sorted = sorted(clf_imp.items(), key=lambda x: -x[1])
reg_imp_sorted = sorted(reg_imp.items(), key=lambda x: -x[1])

# ── Feature correlations with targets ────────────────────────────────────────
corr_reg = df[FINAL_FEATURES + ["cnt"]].corr()["cnt"].drop("cnt")
corr_clf = df[FINAL_FEATURES + ["demand_high"]].corr()["demand_high"].drop("demand_high")

# ── Lasso coefficients (on train split) ──────────────────────────────────────
sc = StandardScaler()
las = Lasso(alpha=0.5, random_state=RANDOM_STATE, max_iter=5000)
X_train_all = df.drop(columns=["cnt", "demand_high"])[FINAL_FEATURES]
las.fit(sc.fit_transform(X_train), y_reg_train)
lasso_coefs = dict(zip(FINAL_FEATURES, las.coef_.tolist()))

# ── Actual test predictions ────────────────────────────────────────────────────
y_clf_pred  = clf_pipe.predict(X_test)
y_clf_prob  = clf_pipe.predict_proba(X_test)[:, 1]
y_reg_pred  = reg_pipe.predict(X_test)

# ── Actual vs predicted sample (for scatter) — 300 random test points ────────
np.random.seed(42)
idx = np.random.choice(len(X_test), size=300, replace=False)
scatter = [
    {"actual": int(y_reg_test.iloc[i]), "predicted": max(0, int(y_reg_pred[i]))}
    for i in idx
]
scatter.sort(key=lambda x: x["actual"])

# ── Residuals distribution (histogram) ───────────────────────────────────────
residuals = (y_reg_pred - y_reg_test.values).tolist()
bins = list(range(-200, 201, 20))
hist_counts, hist_edges = np.histogram(residuals, bins=bins)
residual_hist = [
    {"bin": int(hist_edges[i]), "count": int(hist_counts[i])}
    for i in range(len(hist_counts))
]

# ── Model comparison data ─────────────────────────────────────────────────────
clf_comparison = [
    {"model": "Dummy",              "accuracy": 0.491, "roc_auc": 0.500},
    {"model": "Logistic Regression","accuracy": 0.903, "roc_auc": 0.968},
    {"model": "Decision Tree",      "accuracy": 0.915, "roc_auc": 0.938},
    {"model": "XGBoost",            "accuracy": 0.951, "roc_auc": 0.989},
]

reg_comparison = [
    {"model": "Dummy",         "r2": -0.001, "mae": 140.5, "rmse": 178.0},
    {"model": "Ridge",         "r2": 0.731,  "mae": 68.7,  "rmse": 92.3},
    {"model": "Decision Tree", "r2": 0.887,  "mae": 34.7,  "rmse": 59.9},
    {"model": "XGBoost",       "r2": 0.955,  "mae": 22.8,  "rmse": 37.8},
]

# ── Feature groups for the UI ─────────────────────────────────────────────────
feature_groups = {
    "Temporal": ["hr", "hr_sin", "hr_cos", "mnth", "mnth_sin", "mnth_cos",
                 "weekday", "weekday_cos", "season", "yr"],
    "Weather":  ["weathersit", "temp", "hum", "windspeed", "bad_weather"],
    "Derived":  ["rush_hour", "is_night", "is_weekend", "peak_season", "holiday",
                 "rush_workday", "temp_workday", "comfort"],
}

# Assign group to each feature
feat_group_map = {}
for group, feats in feature_groups.items():
    for f in feats:
        if f in FINAL_FEATURES:
            feat_group_map[f] = group

# ── Assemble output ───────────────────────────────────────────────────────────
out = {
    "features": [
        {
            "name": f,
            "group": feat_group_map.get(f, "Other"),
            "corr_cnt":        round(float(corr_reg.get(f, 0)), 3),
            "corr_demand":     round(float(corr_clf.get(f, 0)), 3),
            "lasso_coef":      round(float(lasso_coefs.get(f, 0)), 4),
            "clf_importance":  round(float(clf_imp.get(f, 0)), 4),
            "reg_importance":  round(float(reg_imp.get(f, 0)), 4),
        }
        for f in FINAL_FEATURES
    ],
    "clf_importance_ranked": [
        {"feature": k, "importance": round(v, 4)} for k, v in clf_imp_sorted
    ],
    "reg_importance_ranked": [
        {"feature": k, "importance": round(v, 4)} for k, v in reg_imp_sorted
    ],
    "clf_comparison": clf_comparison,
    "reg_comparison": reg_comparison,
    "scatter": scatter,
    "residual_hist": residual_hist,
    # Use authoritative held-out test metrics from analysis notebook (not re-computed here
    # because the saved models were trained on ALL data, making in-sample eval misleading).
    "metrics": {
        "clf": {
            "accuracy":  meta["classifier"]["test_accuracy"],
            "roc_auc":   meta["classifier"]["test_roc_auc"],
            "threshold": DEMAND_THRESHOLD,
            "n_train":   len(X_train),
            "n_test":    len(X_test),
        },
        "reg": {
            "r2":   meta["regressor"]["test_r2"],
            "mae":  meta["regressor"]["test_mae"],
            "rmse": meta["regressor"]["test_rmse"],
        },
    },
    "feature_count": len(FINAL_FEATURES),
    "training_rows": len(df),
}

# ── Feature stats for deviation explainer ────────────────────────────────────
feature_stats = {
    feat: {
        "mean": round(float(X[feat].mean()), 4),
        "std":  round(float(X[feat].std()),  4),
    }
    for feat in FINAL_FEATURES
}
out["feature_stats"] = feature_stats
out["avg_cnt"] = round(float(y_reg.mean()), 1)

out_path = Path("frontend/public/science-data.json")
out_path.write_text(json.dumps(out, indent=2))
print(f"Saved {out_path}  ({out_path.stat().st_size // 1024} KB)")
print(f"  Features: {len(FINAL_FEATURES)}")
print(f"  Scatter points: {len(scatter)}")
print(f"  Test accuracy: {out['metrics']['clf']['accuracy']}")
print(f"  Test R²:       {out['metrics']['reg']['r2']}")
