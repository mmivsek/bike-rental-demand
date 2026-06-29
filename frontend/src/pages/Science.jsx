import { useEffect, useState } from 'react'
import {
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const RED  = '#c0392b'
const BLUE = '#2980b9'
const GREEN = '#27ae60'
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
  const [impTab, setImpTab] = useState('reg') // 'clf' | 'reg'

  useEffect(() => {
    fetch('/science-data.json')
      .then(r => { if (!r.ok) throw new Error('science-data.json not found'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErr(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="placeholder"><div className="placeholder-icon">⏳</div><p>Loading…</p></div>
  if (err)     return <div className="error-box">{err}</div>

  const impData = impTab === 'clf' ? data.clf_importance_ranked : data.reg_importance_ranked

  return (
    <div>

      {/* ── 1. Pipeline overview ── */}
      <div className="card">
        <SectionTitle>End-to-end ML pipeline</SectionTitle>
        <Note>
          17,379 hourly records (2011–2012) flow through feature engineering,
          Lasso-based selection, and two separate XGBoost models — one for classification,
          one for regression.
        </Note>
        <div className="pipeline">
          {[
            { step: '1', label: 'Raw data', sub: 'hour.csv · 17 k rows', color: '#6c757d' },
            { step: '2', label: 'Feature engineering', sub: '23 derived features', color: BLUE },
            { step: '3', label: 'Feature selection', sub: 'Lasso + |r| ≥ 0.05', color: PURPLE },
            { step: '4', label: 'XGBoost classifier', sub: 'demand_high (0/1)', color: RED },
            { step: '4b', label: 'XGBoost regressor', sub: 'cnt (bikes/hr)', color: ORANGE },
          ].map((s, i) => (
            <div key={i} className="pipe-step" style={{ borderColor: s.color }}>
              <div className="pipe-num" style={{ background: s.color }}>{s.step}</div>
              <div className="pipe-label">{s.label}</div>
              <div className="pipe-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Feature engineering ── */}
      <div className="card">
        <SectionTitle>Feature engineering — 23 input features</SectionTitle>
        <Note>
          Raw inputs (date, hour, weather codes, raw measurements) are transformed into
          richer numeric signals before any model sees them.
        </Note>

        {/* Formulas */}
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

        {/* Feature table */}
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

      {/* ── 3. Feature selection ── */}
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
        <div className="alert-info" style={{ marginTop: 14 }}>
          Result: all 23 engineered features survived both filters — none were zeroed or below
          the correlation threshold. The full set enters both the classifier and regressor.
        </div>
      </div>

      {/* ── 4. Feature importance ── */}
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

      {/* ── 5. Models explained ── */}
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

      {/* ── 6. Model comparison ── */}
      <div className="card">
        <SectionTitle>Model comparison — test-set performance</SectionTitle>
        <Note>
          All models trained on the same 85 % split (14,772 hours) and evaluated on the
          held-out 15 % (2,607 hours). Dummy baselines show the improvement from ML.
        </Note>
        <div className="grid-2" style={{ gap: 28 }}>
          {/* Classification */}
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

          {/* Regression */}
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

      {/* ── 7. Actual vs predicted scatter ── */}
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

      {/* ── 8. Residuals histogram ── */}
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
              <Tooltip formatter={(v, n) => [v, 'Count']} labelFormatter={v => `Bin starting at ${v}`} />
              <Bar dataKey="count" fill={ORANGE} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <ReferenceLine x={0} stroke={RED} strokeDasharray="4 2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
