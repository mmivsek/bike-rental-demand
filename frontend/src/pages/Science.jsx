import { useEffect, useState } from 'react'
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const RED    = '#c0392b'
const BLUE   = '#2980b9'
const GREEN  = '#27ae60'
const PURPLE = '#8e44ad'
const ORANGE = '#e67e22'

// ── Small helpers ─────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div className="section-title" style={{ marginBottom: 6 }}>{children}</div>
}
function Note({ children }) {
  return <p style={{ fontSize: '0.83rem', color: '#888', marginTop: 6, marginBottom: 18, lineHeight: 1.6 }}>{children}</p>
}
function Formula({ label, eq, desc }) {
  return (
    <div className="formula-row">
      {label && <span className="formula-label">{label}</span>}
      <code className="formula-eq">{eq}</code>
      {desc && <span className="formula-desc">{desc}</span>}
    </div>
  )
}
function MetricPill({ label, value, color }) {
  return (
    <div className="metric-pill" style={{ borderColor: color }}>
      <div className="mp-label">{label}</div>
      <div className="mp-value" style={{ color }}>{value}</div>
    </div>
  )
}
function CodeBlock({ children }) {
  return (
    <pre style={{
      background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8,
      padding: '14px 18px', fontSize: '0.8rem', lineHeight: 1.7,
      overflowX: 'auto', margin: '10px 0',
    }}>
      <code>{children}</code>
    </pre>
  )
}
function ApiRow({ method, what, usedOn }) {
  return (
    <tr>
      <td><code style={{ color: BLUE, fontWeight: 700 }}>{method}</code></td>
      <td style={{ fontSize: '0.85rem' }}>{what}</td>
      <td style={{ fontSize: '0.83rem', color: '#888' }}>{usedOn}</td>
    </tr>
  )
}

const FEATURE_LABELS = {
  hr:           'hr — Hour of day (0–23)',
  hr_sin:       'hr_sin — Sine of hour (cyclic)',
  hr_cos:       'hr_cos — Cosine of hour (cyclic)',
  mnth:         'mnth — Month (1–12)',
  mnth_sin:     'mnth_sin — Sine of month (cyclic)',
  mnth_cos:     'mnth_cos — Cosine of month (cyclic)',
  weekday:      'weekday — Day of week (Mon=0)',
  weekday_cos:  'weekday_cos — Cosine of weekday (cyclic)',
  season:       'season — 1=Spring 2=Summer 3=Fall 4=Winter',
  yr:           'yr — Year indicator (0=2011, 1=2012)',
  weathersit:   'weathersit — UCI code (1=Clear 2=Mist 3=Rain)',
  temp:         'temp — Normalised temperature (°C ÷ 41)',
  hum:          'hum — Normalised humidity (% ÷ 100)',
  windspeed:    'windspeed — Normalised wind (mph ÷ 67)',
  bad_weather:  'bad_weather — 1 if weathersit = 3',
  rush_hour:    'rush_hour — 1 if hr ∈ {7,8,17,18}',
  is_night:     'is_night — 1 if hr < 6 or hr > 22',
  is_weekend:   'is_weekend — 1 if weekday ≥ 5',
  peak_season:  'peak_season — 1 if season ∈ {Summer, Fall}',
  holiday:      'holiday — 1 on public holidays',
  rush_workday: 'rush_workday — rush_hour × workingday',
  temp_workday: 'temp_workday — temp × workingday',
  comfort:      'comfort — temp × (1 − hum) × (1 − windspeed)',
}

const GROUP_COLOR = { Temporal: BLUE, Weather: ORANGE, Derived: GREEN }

const CUSTOM_IMP_TOOLTIP = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{FEATURE_LABELS[d.feature] || d.feature}</div>
      <div>Importance: <b>{(d.importance * 100).toFixed(1)}%</b></div>
    </div>
  )
}

const CUSTOM_SCATTER_TOOLTIP = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem' }}>
      <div>Actual: <b>{d.actual}</b> bikes/hr</div>
      <div>Predicted: <b>{d.predicted}</b> bikes/hr</div>
      <div style={{ color: '#aaa', marginTop: 2 }}>Error: {d.predicted - d.actual > 0 ? '+' : ''}{d.predicted - d.actual}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Science() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [impTab, setImpTab] = useState('reg')

  useEffect(() => {
    fetch('/science-data.json')
      .then(r => { if (!r.ok) throw new Error('science-data.json not found'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="placeholder"><div className="placeholder-icon">⏳</div><p>Loading…</p></div>
  if (err)     return <div className="error-box">{err}</div>

  const impData = impTab === 'clf' ? data.clf_importance_ranked : data.reg_importance_ranked
  const nTrain  = data.metrics.clf.n_train
  const nTest   = data.metrics.clf.n_test

  return (
    <div>

      {/* ── 0. The two ML questions ── */}
      <div className="card">
        <SectionTitle>The two ML questions we're answering</SectionTitle>
        <Note>
          Before writing a single line of model code, we defined exactly what we want the model to predict.
          This project uses two separate models because the questions are fundamentally different.
        </Note>
        <div className="grid-2" style={{ gap: 20 }}>
          <div className="method-box" style={{ borderColor: RED }}>
            <div className="method-title" style={{ color: RED }}>Question 1 — Classification</div>
            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: '8px 0 12px', color: '#444' }}>
              "Is this a high-demand hour?"
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              The target variable <code>demand_high</code> is <b>0</b> (low) or <b>1</b> (high).
              It is derived from the raw rental count: any hour with more than <b>142 bikes/hr</b> (the median)
              is labelled high demand. This gives balanced classes — roughly 50% high, 50% low.
            </p>
            <Formula eq="demand_high = 1  if cnt > 142  else  0" desc="threshold = median of cnt" />
            <div style={{ marginTop: 10, fontSize: '0.83rem', color: '#666' }}>
              Algorithm: <b>XGBClassifier</b> · outputs 0 or 1, plus a probability via <code>.predict_proba()</code>
            </div>
          </div>
          <div className="method-box" style={{ borderColor: ORANGE }}>
            <div className="method-title" style={{ color: ORANGE }}>Question 2 — Regression</div>
            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: '8px 0 12px', color: '#444' }}>
              "How many bikes will be rented this hour?"
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              The target variable <code>cnt</code> is the raw hourly rental count — a continuous number
              ranging from 1 to 977. The model predicts the actual value, not a category.
            </p>
            <Formula eq="target = cnt  (bikes rented per hour)" desc="range: 1 – 977 in the dataset" />
            <div style={{ marginTop: 10, fontSize: '0.83rem', color: '#666' }}>
              Algorithm: <b>XGBRegressor</b> · outputs a continuous number via <code>.predict()</code>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. sklearn API ── */}
      <div className="card">
        <SectionTitle>The scikit-learn API — one pattern, every model</SectionTitle>
        <Note>
          Every model in scikit-learn (and XGBoost, which follows the same convention) exposes
          the same handful of methods. Learn them once and you can use any algorithm.
        </Note>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>What it does</th>
                <th>Used on</th>
              </tr>
            </thead>
            <tbody>
              <ApiRow method=".fit(X, y)"         what="Learns parameters from training data. This is the only step that touches the labels."  usedOn="every estimator" />
              <ApiRow method=".predict(X)"         what="Produces the model's prediction for each row in X."                                     usedOn="models" />
              <ApiRow method=".predict_proba(X)"   what="Returns class probabilities (e.g. 73% chance of high demand), not just the label."      usedOn="classifiers" />
              <ApiRow method=".transform(X)"       what="Outputs transformed features — e.g. scaled numbers, encoded categories."                usedOn="preprocessors" />
              <ApiRow method=".fit_transform(X)"   what="fit then transform in one call. Only safe to use on training data."                     usedOn="preprocessors" />
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 8 }}>
          The key insight: <code>LinearRegression().fit(X, y)</code> has the exact same shape as
          <code> XGBClassifier().fit(X, y)</code> — only the import line changes. This is why you
          can swap algorithms without rewriting your pipeline.
        </p>
        <CodeBlock>{`from sklearn.linear_model import LinearRegression
from xgboost import XGBClassifier

# Both use the exact same .fit() / .predict() pattern
reg = LinearRegression()
reg.fit(X_train, y_train)        # learns from data
predictions = reg.predict(X_test) # produces numbers

clf = XGBClassifier()
clf.fit(X_train, y_train)
labels = clf.predict(X_test)          # 0 or 1
probs  = clf.predict_proba(X_test)    # [[0.27, 0.73], ...]`}
        </CodeBlock>
      </div>

      {/* ── 2. Train/test split ── */}
      <div className="card">
        <SectionTitle>Train / test split — the golden rule</SectionTitle>
        <div className="alert-info" style={{ marginBottom: 16, fontWeight: 600 }}>
          Mantra: the test set is touched exactly once, at the very end.
          Any decision made using test rows corrupts your evaluation.
        </div>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 14 }}>
          We fit on <b>training</b> data and judge on a held-out <b>test</b> set the model has never seen.
          A model that memorises training rows but fails on new ones has <em>overfit</em> — it is useless in production.
          The test set is our honest estimate of generalisation to the real world.
        </p>
        <div className="grid-2" style={{ gap: 20, marginBottom: 16 }}>
          <div className="method-box" style={{ borderColor: BLUE }}>
            <div className="method-title" style={{ color: BLUE }}>Our split: 85 % / 15 %</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <MetricPill label="Training rows" value={nTrain.toLocaleString()} color={BLUE} />
              <MetricPill label="Test rows"     value={nTest.toLocaleString()}  color={RED} />
              <MetricPill label="Total dataset" value={(nTrain + nTest).toLocaleString()} color="#6c757d" />
            </div>
            <p style={{ fontSize: '0.83rem', marginTop: 12, lineHeight: 1.7 }}>
              <b>test_size = 0.15</b> — 15 % of the 17,379 rows are set aside before any feature
              selection, scaling, or model training. They are not touched again until the final
              accuracy/R² numbers are computed.
            </p>
            <p style={{ fontSize: '0.83rem', marginTop: 8, lineHeight: 1.7 }}>
              <b>random_state = 42</b> — the same 2,607 rows are held out every time the code runs,
              making results fully reproducible.
            </p>
          </div>
          <div className="method-box" style={{ borderColor: ORANGE }}>
            <div className="method-title" style={{ color: ORANGE }}>Why not use all data for training?</div>
            <p style={{ fontSize: '0.83rem', marginTop: 10, lineHeight: 1.7 }}>
              If you train on all rows you have no way to measure how the model performs on
              <em> unseen</em> data. You could report 99% accuracy simply because the model
              memorised every row — that number means nothing for real-world predictions.
            </p>
            <p style={{ fontSize: '0.83rem', marginTop: 8, lineHeight: 1.7 }}>
              The held-out test set acts as a simulation of real future data the model will
              encounter in production.
            </p>
          </div>
        </div>
        <CodeBlock>{`from sklearn.model_selection import train_test_split

# Split features and both targets at the same time
X_train, X_test, y_clf_train, y_clf_test = train_test_split(
    X, y_clf,
    test_size=0.15,    # 15 % held out
    random_state=42    # reproducible — same rows every run
)

# Same split for regression target (same random_state = same rows)
_, _, y_reg_train, y_reg_test = train_test_split(
    X, y_reg, test_size=0.15, random_state=42
)

print(f"Train: {len(X_train):,} rows | Test: {len(X_test):,} rows")
# → Train: 14,772 rows | Test: 2,607 rows`}
        </CodeBlock>
      </div>

      {/* ── 3. Dummy baseline ── */}
      <div className="card">
        <SectionTitle>Dummy baseline — what does "better than nothing" look like?</SectionTitle>
        <Note>
          Before comparing models, we need a floor. A dummy model ignores all features and
          makes the simplest possible prediction. Any real model must beat this to be useful.
        </Note>
        <div className="grid-2" style={{ gap: 20, marginBottom: 16 }}>
          <div className="method-box" style={{ borderColor: RED }}>
            <div className="method-title" style={{ color: RED }}>DummyClassifier — always predicts the majority class</div>
            <p style={{ fontSize: '0.83rem', lineHeight: 1.7, marginTop: 8 }}>
              Because classes are balanced (≈50/50), it predicts roughly at random.
              Accuracy near 50 % and AUC = 0.5 (coin flip) confirm there is <em>no</em> signal being used.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <MetricPill label="Accuracy" value="49.1 %" color={RED} />
              <MetricPill label="ROC-AUC"  value="0.500"  color="#6c757d" />
            </div>
            <p style={{ fontSize: '0.83rem', color: '#888', marginTop: 10 }}>
              XGBoost achieves 95.1 % accuracy and AUC 0.989 — a massive improvement over the baseline.
            </p>
          </div>
          <div className="method-box" style={{ borderColor: ORANGE }}>
            <div className="method-title" style={{ color: ORANGE }}>DummyRegressor — always predicts the mean</div>
            <p style={{ fontSize: '0.83rem', lineHeight: 1.7, marginTop: 8 }}>
              It predicts the average rental count (≈189 bikes/hr) for every single hour.
              R² near zero means it explains none of the variance. MAE of 140.5 means it is
              on average 140 bikes wrong per hour.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <MetricPill label="R²"  value="-0.001" color={RED} />
              <MetricPill label="MAE" value="140.5 bikes/hr" color="#6c757d" />
            </div>
            <p style={{ fontSize: '0.83rem', color: '#888', marginTop: 10 }}>
              XGBoost achieves R² = 0.955 and MAE = 22.8 — predicting within 23 bikes on average.
            </p>
          </div>
        </div>
        <CodeBlock>{`from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.metrics import accuracy_score, roc_auc_score, r2_score, mean_absolute_error

# Classification dummy
dummy_clf = DummyClassifier(strategy="most_frequent")
dummy_clf.fit(X_train, y_clf_train)
print(accuracy_score(y_clf_test, dummy_clf.predict(X_test)))   # → 0.491
print(roc_auc_score(y_clf_test, dummy_clf.predict_proba(X_test)[:,1]))  # → 0.500

# Regression dummy
dummy_reg = DummyRegressor(strategy="mean")
dummy_reg.fit(X_train, y_reg_train)
print(r2_score(y_reg_test, dummy_reg.predict(X_test)))          # → -0.001
print(mean_absolute_error(y_reg_test, dummy_reg.predict(X_test)))  # → 140.5`}
        </CodeBlock>
      </div>

      {/* ── 4. Pipeline overview ── */}
      <div className="card">
        <SectionTitle>End-to-end ML pipeline</SectionTitle>
        <Note>
          17,379 hourly records (2011–2012) flow through feature engineering,
          Lasso-based selection, and two separate XGBoost models — one for classification,
          one for regression.
        </Note>
        <div className="pipeline">
          {[
            { step: '1', label: 'Raw data',            sub: 'hour.csv · 17 k rows',      color: '#6c757d' },
            { step: '2', label: 'Feature engineering', sub: '23 derived features',        color: BLUE },
            { step: '3', label: 'Feature selection',   sub: 'Lasso + |r| ≥ 0.05',        color: PURPLE },
            { step: '4', label: 'XGBoost classifier',  sub: 'demand_high (0/1)',          color: RED },
            { step: '4b', label: 'XGBoost regressor',  sub: 'cnt (bikes/hr)',             color: ORANGE },
          ].map((s, i) => (
            <div key={i} className="pipe-step" style={{ borderColor: s.color }}>
              <div className="pipe-num" style={{ background: s.color }}>{s.step}</div>
              <div className="pipe-label">{s.label}</div>
              <div className="pipe-sub">{s.sub}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.7, marginTop: 16 }}>
          Both models are wrapped in a <b>scikit-learn Pipeline</b> that first scales features
          with <code>StandardScaler</code> and then runs the XGBoost model. Bundling preprocessing
          and model into one object is the key to avoiding data leakage (see below).
        </p>
        <CodeBlock>{`from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

# Classifier pipeline: scale → XGBoost
clf_pipeline = Pipeline([
    ("sc",    StandardScaler()),
    ("model", XGBClassifier(
        n_estimators=200, max_depth=6,
        learning_rate=0.1, subsample=0.8,
        random_state=42, eval_metric="logloss",
    )),
])

# Regressor pipeline: same structure, different model
reg_pipeline = Pipeline([
    ("sc",    StandardScaler()),
    ("model", XGBRegressor(
        n_estimators=400, max_depth=6,
        learning_rate=0.05, subsample=0.8,
        random_state=42,
    )),
])

clf_pipeline.fit(X_final, y_clf)   # .fit() on ALL data for the saved model
reg_pipeline.fit(X_final, y_reg)`}
        </CodeBlock>
      </div>

      {/* ── 5. Feature engineering ── */}
      <div className="card">
        <SectionTitle>Feature engineering — 23 input features</SectionTitle>
        <Note>
          Raw inputs (date, hour, weather codes, raw measurements) are transformed into
          richer numeric signals before any model sees them.
        </Note>

        <div className="formula-block">
          <div className="formula-section-label">Normalisation</div>
          <Formula eq="temp  = temp_c / 41"              desc="°C → [0, 1], max observed = 41 °C" />
          <Formula eq="hum   = hum_pct / 100"            desc="% → [0, 1]" />
          <Formula eq="windspeed = (wind_kmh / 1.609) / 67" desc="km/h → mph → [0, 1], max observed = 67 mph" />

          <div className="formula-section-label" style={{ marginTop: 14 }}>Cyclic encoding (avoids discontinuity at midnight / December)</div>
          <Formula eq="hr_sin  = sin(2π · hr / 24)"  desc="hour 0 and 23 are neighbours" />
          <Formula eq="hr_cos  = cos(2π · hr / 24)" />
          <Formula eq="mnth_sin = sin(2π · mnth / 12)" desc="January and December are neighbours" />
          <Formula eq="weekday_cos = cos(2π · weekday / 7)" />

          <div className="formula-section-label" style={{ marginTop: 14 }}>Interaction & comfort features</div>
          <Formula eq="comfort = temp × (1 − hum) × (1 − windspeed)" desc="proxy for perceived cycling comfort" />
          <Formula eq="rush_workday = rush_hour × workingday"           desc="rush hour only on working days" />
          <Formula eq="temp_workday = temp × workingday"                desc="temperature effect amplified on commuting days" />

          <div className="formula-section-label" style={{ marginTop: 14 }}>Binary flags</div>
          <Formula eq="rush_hour  = 1  if hr ∈ {7, 8, 17, 18}"  desc="morning + evening commute" />
          <Formula eq="is_night   = 1  if hr < 6 or hr > 22" />
          <Formula eq="is_weekend = 1  if weekday ≥ 5" />
          <Formula eq="peak_season = 1 if season ∈ {Summer, Fall}" />
          <Formula eq="bad_weather = 1 if weathersit = 3"            desc="rain or snow" />

          <div className="formula-section-label" style={{ marginTop: 14 }}>Classification target</div>
          <Formula eq="demand_high = 1  if cnt > 142  else  0" desc="median cnt = 142 bikes/hr — balanced classes" />
        </div>

        <div className="table-wrap" style={{ marginTop: 18 }}>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Group</th>
                <th style={{ textAlign: 'right' }}>Corr with cnt</th>
                <th style={{ textAlign: 'right' }}>Corr with demand_high</th>
                <th style={{ textAlign: 'right' }}>Lasso coef</th>
              </tr>
            </thead>
            <tbody>
              {data.features.map(f => (
                <tr key={f.name}>
                  <td><code style={{ fontSize: '0.82rem', background: '#f8f9fa', padding: '1px 5px', borderRadius: 3 }}>{f.name}</code></td>
                  <td>
                    <span className="group-badge" style={{ background: GROUP_COLOR[f.group] + '22', color: GROUP_COLOR[f.group], border: `1px solid ${GROUP_COLOR[f.group]}44` }}>
                      {f.group}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: f.corr_cnt > 0 ? GREEN : f.corr_cnt < 0 ? RED : '#aaa', fontWeight: 600 }}>
                    {f.corr_cnt > 0 ? '+' : ''}{f.corr_cnt.toFixed(3)}
                  </td>
                  <td style={{ textAlign: 'right', color: f.corr_demand > 0 ? GREEN : f.corr_demand < 0 ? RED : '#aaa', fontWeight: 600 }}>
                    {f.corr_demand > 0 ? '+' : ''}{f.corr_demand.toFixed(3)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.83rem' }}>
                    {f.lasso_coef !== 0 ? f.lasso_coef.toFixed(4) : <span style={{ color: '#ccc' }}>zeroed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. Feature selection ── */}
      <div className="card">
        <SectionTitle>Feature selection — Lasso + correlation filter</SectionTitle>
        <Note>
          Two complementary filters were applied on the 85 % training split to avoid
          data leakage. A feature was kept if it survived either test.
        </Note>
        <div className="grid-2">
          <div className="method-box" style={{ borderColor: BLUE }}>
            <div className="method-title" style={{ color: BLUE }}>Lasso regularisation (α = 0.5)</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              Lasso (L1 penalty) shrinks weak coefficients to exactly zero during
              a linear regression fit on the scaled training data. Any feature
              with a non-zero coefficient after convergence is retained.
            </p>
            <Formula eq="min  ½n ‖Xβ − y‖² + α‖β‖₁" />
          </div>
          <div className="method-box" style={{ borderColor: ORANGE }}>
            <div className="method-title" style={{ color: ORANGE }}>Pearson correlation threshold (|r| ≥ 0.05)</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              Pearson's r measures the linear relationship between each feature and
              the rental count. Features below the threshold carry no linear signal
              and are removed.
            </p>
            <Formula eq="r = Σ(xᵢ−x̄)(yᵢ−ȳ) / √[Σ(xᵢ−x̄)² Σ(yᵢ−ȳ)²]" />
          </div>
        </div>
        <CodeBlock>{`from sklearn.linear_model import Lasso
from sklearn.preprocessing import StandardScaler

# Feature selection runs on TRAINING DATA ONLY — never touches the test set
sc  = StandardScaler()
las = Lasso(alpha=0.5, random_state=42, max_iter=5000)
las.fit(sc.fit_transform(X_train), y_reg_train)

# Keep features with non-zero Lasso coefficient
kept_lasso = [f for f, c in zip(features, las.coef_) if c != 0]

# Keep features with |Pearson r| ≥ 0.05 against the rental count
corr = X_train.corrwith(y_reg_train)
kept_corr = corr[corr.abs() >= 0.05].index.tolist()

# Final set: union of both filters
FINAL_FEATURES = sorted(set(kept_corr) | set(kept_lasso))
# Result: all 23 features survived both filters`}
        </CodeBlock>
        <div className="alert-info" style={{ marginTop: 14 }}>
          Result: all 23 engineered features survived both filters — none were zeroed or below
          the correlation threshold. The full set enters both the classifier and regressor.
        </div>
      </div>

      {/* ── 7. Data leakage ── */}
      <div className="card">
        <SectionTitle>Data leakage — and how we prevented it</SectionTitle>
        <Note>
          Data leakage means information from outside the training fold sneaks into training,
          making your test score look better than it really is. You ship a model that looked
          excellent in testing and then disappoints on live data.
        </Note>
        <div className="grid-2" style={{ gap: 20, marginBottom: 16 }}>
          <div className="method-box" style={{ borderColor: RED }}>
            <div className="method-title" style={{ color: RED }}>Three common forms of leakage</div>
            <ol style={{ fontSize: '0.85rem', lineHeight: 1.8, paddingLeft: 18, margin: '10px 0 0' }}>
              <li><b>Train/test contamination</b> — fitting a scaler or feature selector on the full dataset before splitting.</li>
              <li><b>Target leakage</b> — a feature that secretly encodes the answer (e.g. "refunded" when predicting "will purchase").</li>
              <li><b>Temporal leakage</b> — using future information to predict the past.</li>
            </ol>
          </div>
          <div className="method-box" style={{ borderColor: GREEN }}>
            <div className="method-title" style={{ color: GREEN }}>How we prevented it</div>
            <ul style={{ fontSize: '0.85rem', lineHeight: 1.8, paddingLeft: 18, margin: '10px 0 0' }}>
              <li>All preprocessing (StandardScaler) lives <b>inside the Pipeline</b> — it can only see training rows.</li>
              <li>Feature selection (Lasso + Pearson) was computed on the <b>training split only</b>, then applied to the test set.</li>
              <li>The test set was never used to make any decisions — only to report final metrics.</li>
            </ul>
          </div>
        </div>
        <CodeBlock>{`# ❌ WRONG — scaler fitted on ALL data before splitting
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)          # test rows contaminate the scaler
X_train, X_test = train_test_split(X_scaled, ...)

# ✅ RIGHT — scaler lives inside the Pipeline, only sees training rows
pipeline = Pipeline([
    ("sc",    StandardScaler()),   # .fit() called only on X_train inside Pipeline
    ("model", XGBClassifier()),
])
pipeline.fit(X_train, y_train)     # scaler fitted here, on train only
pipeline.predict(X_test)           # scaler .transform() applied here, no leakage`}
        </CodeBlock>
      </div>

      {/* ── 8. Feature importance ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <SectionTitle>XGBoost feature importance (F-score)</SectionTitle>
          <div className="tab-toggle">
            <button className={impTab === 'reg' ? 'active' : ''} onClick={() => setImpTab('reg')}>Regression</button>
            <button className={impTab === 'clf' ? 'active' : ''} onClick={() => setImpTab('clf')}>Classification</button>
          </div>
        </div>
        <Note>
          F-score = number of times a feature is used as a split across all trees.
          {impTab === 'reg'
            ? ' For predicting rental count, hour-of-day dominates, followed by temperature and rush-hour interaction.'
            : ' For classifying high vs low demand, the same time features lead, but rush_workday becomes more prominent.'}
        </Note>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart
              data={impData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 110, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={108} />
              <Tooltip content={<CUSTOM_IMP_TOOLTIP />} />
              <Bar dataKey="importance" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {impData.map((d, i) => (
                  <Cell key={i} fill={impTab === 'reg' ? ORANGE : RED} fillOpacity={1 - i * 0.03} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 9. Models explained ── */}
      <div className="card">
        <SectionTitle>How XGBoost works — gradient boosting in brief</SectionTitle>
        <Note>Both models share the same algorithm family; only their target and hyperparameters differ.</Note>
        <div className="grid-2" style={{ gap: 20 }}>
          <div>
            <div className="step-list">
              {[
                ['Build a shallow tree', 'A decision tree of depth ≤ 6 makes predictions. Shallow trees are weak but fast.'],
                ['Compute residuals', 'Subtract predictions from the true values to get a residual error signal.'],
                ['Fit the next tree on residuals', 'The next tree learns to correct where the previous one was wrong.'],
                ['Add trees with a learning rate', "Each tree's contribution is scaled by lr (0.05–0.10) to avoid overfitting."],
                ['Repeat 200–400 times', 'The ensemble of trees converges to a powerful combined predictor.'],
              ].map(([title, body], i) => (
                <div key={i} className="step-item">
                  <div className="step-num">{i + 1}</div>
                  <div>
                    <div className="step-title">{title}</div>
                    <div className="step-body">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="formula-block" style={{ marginBottom: 0 }}>
              <div className="formula-section-label">Objective function (regression)</div>
              <Formula eq="L(θ) = Σ l(yᵢ, ŷᵢ) + Σ Ω(fₖ)" desc="loss + regularisation" />
              <Formula eq="l(y,ŷ) = ½(y − ŷ)²" desc="squared error per sample" />
              <Formula eq="Ω(f) = γT + ½λ‖w‖²" desc="T = leaf count, w = leaf weights" />

              <div className="formula-section-label" style={{ marginTop: 14 }}>Objective function (classification)</div>
              <Formula eq="l(y,ŷ) = −[y log σ(ŷ) + (1−y) log(1−σ(ŷ))]" desc="binary log-loss" />
              <Formula eq="σ(x) = 1 / (1 + e⁻ˣ)" desc="sigmoid → probability in [0,1]" />
              <Formula eq="predict: demand_high = 1  if σ(ŷ) > 0.5" />
            </div>

            <div className="hparam-grid" style={{ marginTop: 18 }}>
              <div className="hparam-section">Classifier hyperparameters</div>
              {[
                ['n_estimators', '200', 'number of trees'],
                ['max_depth', '6', 'maximum tree depth'],
                ['learning_rate', '0.10', 'shrinkage per tree'],
                ['subsample', '0.80', 'row sampling fraction'],
              ].map(([k, v, d]) => (
                <div key={k} className="hparam-row">
                  <code className="hparam-key">{k}</code>
                  <span className="hparam-val">{v}</span>
                  <span className="hparam-desc">{d}</span>
                </div>
              ))}
              <div className="hparam-section" style={{ marginTop: 10 }}>Regressor hyperparameters</div>
              {[
                ['n_estimators', '400', 'more trees for smoother counts'],
                ['max_depth', '6', 'same depth cap'],
                ['learning_rate', '0.05', 'lower rate → more trees needed'],
                ['subsample', '0.80', 'row sampling fraction'],
              ].map(([k, v, d]) => (
                <div key={k} className="hparam-row">
                  <code className="hparam-key">{k}</code>
                  <span className="hparam-val">{v}</span>
                  <span className="hparam-desc">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 10. Model comparison ── */}
      <div className="card">
        <SectionTitle>Model comparison — test-set performance</SectionTitle>
        <Note>
          All models trained on the same 85 % split ({nTrain.toLocaleString()} hours) and evaluated on the
          held-out 15 % ({nTest.toLocaleString()} hours). Dummy baselines show the improvement from ML.
        </Note>
        <div className="grid-2" style={{ gap: 28 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, color: RED }}>
              Classification — demand_high (0/1)
            </div>
            <div className="chart-wrap" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.clf_comparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => `${(v*100).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="accuracy" name="Accuracy" fill={RED}  isAnimationActive={false} radius={[3,3,0,0]} />
                  <Bar dataKey="roc_auc"  name="ROC-AUC"  fill={BLUE} isAnimationActive={false} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <MetricPill label="Accuracy"  value={`${(data.metrics.clf.accuracy * 100).toFixed(1)} %`} color={RED} />
              <MetricPill label="ROC-AUC"   value={data.metrics.clf.roc_auc.toFixed(3)}                 color={BLUE} />
              <MetricPill label="Threshold" value={`> ${data.metrics.clf.threshold} bikes/hr`}          color="#6c757d" />
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, color: ORANGE }}>
              Regression — cnt (bikes/hour)
            </div>
            <div className="chart-wrap" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.reg_comparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mae"  name="MAE (bikes/hr)"  fill={ORANGE} isAnimationActive={false} radius={[3,3,0,0]} />
                  <Bar dataKey="rmse" name="RMSE (bikes/hr)" fill={PURPLE} isAnimationActive={false} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <MetricPill label="R²"   value={data.metrics.reg.r2.toFixed(3)}               color={GREEN} />
              <MetricPill label="MAE"  value={`${data.metrics.reg.mae} bikes/hr`}            color={ORANGE} />
              <MetricPill label="RMSE" value={`${data.metrics.reg.rmse} bikes/hr`}           color={PURPLE} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 11. Actual vs predicted ── */}
      <div className="card">
        <SectionTitle>Regression — actual vs predicted (300 sample points)</SectionTitle>
        <Note>
          Points along the diagonal indicate perfect prediction. Spread away from it shows
          the model's residual error. Most variance occurs at peak hours (&gt; 400 bikes/hr).
        </Note>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="actual"    name="Actual"    tick={{ fontSize: 11 }} label={{ value: 'Actual (bikes/hr)', position: 'insideBottom', offset: -4, style: { fontSize: 11, fill: '#888' } }} />
              <YAxis type="number" dataKey="predicted" name="Predicted" tick={{ fontSize: 11 }} label={{ value: 'Predicted', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#888' } }} />
              <Tooltip content={<CUSTOM_SCATTER_TOOLTIP />} />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: 900, y: 900 }]}
                stroke={RED} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: 'Perfect', position: 'insideTopLeft', style: { fontSize: 10, fill: RED } }}
              />
              <Scatter data={data.scatter} fill={BLUE} fillOpacity={0.45} r={3} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 12. Residuals ── */}
      <div className="card">
        <SectionTitle>Residual distribution — regressor</SectionTitle>
        <Note>
          Residual = predicted − actual. A bell-shaped distribution centred near zero
          confirms the model has no systematic bias. The long tails correspond to
          exceptional peak hours the model underestimates.
        </Note>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.residual_hist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="bin" tick={{ fontSize: 11 }} label={{ value: 'Residual (bikes/hr)', position: 'insideBottom', offset: -4, style: { fontSize: 11, fill: '#888' } }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'Count']} labelFormatter={v => `Bin starting at ${v}`} />
              <Bar dataKey="count" fill={ORANGE} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <ReferenceLine x={0} stroke={RED} strokeDasharray="4 2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
