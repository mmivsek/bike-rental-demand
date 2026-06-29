"""
Train final XGBoost models on all available data and save them as .pkl files.

Run once:  python train_save_models.py
Outputs:
  models/classifier.pkl   - XGBClassifier pipeline (demand_high: 0/1)
  models/regressor.pkl    - XGBRegressor pipeline (cnt: hourly rentals)
  models/metadata.json    - feature names, threshold, model info
"""

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Lasso
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

RANDOM_STATE = 42
DEMAND_THRESHOLD = 142  # median cnt used to derive demand_high

# ── 1. Load engineered dataset ───────────────────────────────────────────────
df = pd.read_csv("dataset/hour_engineered.csv")

TARGET_REG = "cnt"
TARGET_CLF = "demand_high"

X = df.drop(columns=[TARGET_REG, TARGET_CLF])
y_reg = df[TARGET_REG]
y_clf = df[TARGET_CLF]

print(f"Full dataset: {len(df):,} rows x {X.shape[1]} features")

# ── 2. Derive final feature set (same logic as analysis.qmd, on all data) ───
#    We fit Lasso on the train split to avoid leakage, then apply to all data.
X_train_sel, _, y_train_sel, _ = train_test_split(
    X, y_reg, test_size=0.15, random_state=RANDOM_STATE
)

_sc = StandardScaler()
_las = Lasso(alpha=0.5, random_state=RANDOM_STATE, max_iter=5000)
_las.fit(_sc.fit_transform(X_train_sel), y_train_sel)

lasso_df = pd.DataFrame({"feature": X_train_sel.columns, "coef": _las.coef_})
kept_lasso = lasso_df[lasso_df["coef"] != 0]["feature"].tolist()

corr = pd.concat([X_train_sel, y_train_sel], axis=1).corr()[TARGET_REG].drop(TARGET_REG)
kept_corr = corr[corr.abs() >= 0.05].index.tolist()

FINAL_FEATURES = sorted(set(kept_corr) | set(kept_lasso))
print(f"Final feature set: {len(FINAL_FEATURES)} features")

# ── 3. Train on ALL data with best hyperparameters from analysis ─────────────
#    Best params identified in Part D:
#      classifier: lr=0.1, depth=6, n_estimators=200, subsample=0.8
#      regressor:  lr=0.05, depth=6, n_estimators=400, subsample=0.8

X_final = X[FINAL_FEATURES]

clf_pipeline = Pipeline([
    ("sc", StandardScaler()),
    ("model", XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        random_state=RANDOM_STATE,
        eval_metric="logloss",
        verbosity=0,
    )),
])

reg_pipeline = Pipeline([
    ("sc", StandardScaler()),
    ("model", XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        random_state=RANDOM_STATE,
        verbosity=0,
    )),
])

print("Training classifier on full dataset...")
clf_pipeline.fit(X_final, y_clf)

print("Training regressor on full dataset...")
reg_pipeline.fit(X_final, y_reg)

# ── 4. Quick sanity check ────────────────────────────────────────────────────
from sklearn.metrics import accuracy_score, r2_score, mean_absolute_error

clf_train_acc = accuracy_score(y_clf, clf_pipeline.predict(X_final))
reg_train_r2  = r2_score(y_reg, reg_pipeline.predict(X_final))
print(f"\nTrain accuracy (expected ~99%): {clf_train_acc:.3f}")
print(f"Train R2       (expected ~99%): {reg_train_r2:.3f}")
print("(Train metrics are inflated — test-set metrics from analysis.qmd are authoritative)")

# ── 5. Save models ────────────────────────────────────────────────────────────
models_dir = Path("models")
models_dir.mkdir(exist_ok=True)

clf_path = models_dir / "classifier.pkl"
reg_path = models_dir / "regressor.pkl"
meta_path = models_dir / "metadata.json"

with open(clf_path, "wb") as f:
    pickle.dump(clf_pipeline, f)

with open(reg_path, "wb") as f:
    pickle.dump(reg_pipeline, f)

metadata = {
    "feature_names": FINAL_FEATURES,
    "demand_threshold": DEMAND_THRESHOLD,
    "classifier": {
        "target": TARGET_CLF,
        "description": "Predicts high (1) or low (0) demand for a given hour",
        "test_accuracy": 0.951,
        "test_roc_auc": 0.989,
        "params": {"n_estimators": 200, "max_depth": 6, "learning_rate": 0.1, "subsample": 0.8},
    },
    "regressor": {
        "target": TARGET_REG,
        "description": "Predicts hourly rental count",
        "test_r2": 0.955,
        "test_mae": 22.8,
        "test_rmse": 37.8,
        "params": {"n_estimators": 400, "max_depth": 6, "learning_rate": 0.05, "subsample": 0.8},
    },
    "training_rows": len(df),
    "random_state": RANDOM_STATE,
}

with open(meta_path, "w") as f:
    json.dump(metadata, f, indent=2)

print(f"\nSaved:")
print(f"  {clf_path}   ({clf_path.stat().st_size / 1024:.0f} KB)")
print(f"  {reg_path}   ({reg_path.stat().st_size / 1024:.0f} KB)")
print(f"  {meta_path}")
print("\nDone. Models ready for the Streamlit app.")
