// Architecture & Tech Stack page
const STATS = [
  { label: 'Python files',    value: '3',      sub: 'train · API · data gen' },
  { label: 'React pages',     value: '6',      sub: 'Predictor, Science, Charts…' },
  { label: 'Lines of code',   value: '~2,600', sub: 'frontend + backend combined' },
  { label: 'API endpoints',   value: '3',      sub: '/predict  /predict-day  /' },
  { label: 'Features',        value: '23',     sub: 'after engineering + selection' },
]

const STACK = [
  {
    group: 'Frontend',
    color: '#2980b9',
    items: [
      { name: 'React 18',          role: 'UI framework — component-based SPA' },
      { name: 'Vite',              role: 'Build tool — instant HMR, fast prod bundle' },
      { name: 'Recharts',          role: 'Charts — line, bar, scatter, reference lines' },
      { name: 'react-datepicker',  role: 'Calendar with custom day colouring' },
      { name: 'react-leaflet',     role: 'Station map on the About page' },
    ],
  },
  {
    group: 'Backend',
    color: '#27ae60',
    items: [
      { name: 'FastAPI 0.115',     role: 'REST API — async, auto-docs at /docs' },
      { name: 'uvicorn',           role: 'ASGI server — runs FastAPI in production' },
      { name: 'Python 3.11',       role: 'Pinned via .python-version for wheel compat' },
      { name: 'pydantic',          role: 'Request/response validation + serialisation' },
    ],
  },
  {
    group: 'Machine Learning',
    color: '#c0392b',
    items: [
      { name: 'scikit-learn 1.9',  role: 'Pipelines, StandardScaler, Lasso, metrics' },
      { name: 'XGBoost 3.2',       role: 'Gradient boosting — classifier + regressor' },
      { name: 'pandas 2.2',        role: 'Data loading, feature engineering, splits' },
      { name: 'numpy 1.26',        role: 'Numerical ops — cyclic encoding, sampling' },
    ],
  },
  {
    group: 'Data & APIs',
    color: '#e67e22',
    items: [
      { name: 'UCI Bike Sharing Dataset', role: '17,379 hourly rows — Capital Bikeshare 2011–2012' },
      { name: 'Open-Meteo API',           role: 'Free weather API — no key needed, used live + forecast' },
    ],
  },
  {
    group: 'Deployment',
    color: '#8e44ad',
    items: [
      { name: 'GitHub',     role: 'Source of truth — pushes trigger both Vercel and Render' },
      { name: 'Vercel',     role: 'Hosts static frontend — auto-deploys on every push to master' },
      { name: 'Render.com', role: 'Hosts FastAPI backend — free tier, sleeps after 15 min idle' },
    ],
  },
]

const FILES = [
  { path: 'train_save_models.py',              lines: 147, role: 'Offline training — fits both XGBoost pipelines, saves .pkl + metadata.json' },
  { path: 'api/main.py',                       lines: 169, role: 'FastAPI backend — loads models at startup, serves /predict and /predict-day' },
  { path: 'generate_science_data.py',          lines: 180, role: 'Extracts importances, correlations, stats into science-data.json for the UI' },
  { path: 'frontend/src/pages/Predictor.jsx',  lines: 771, role: 'Main prediction UI — date picker, weather, day chart, deviation explainer' },
  { path: 'frontend/src/pages/Science.jsx',    lines: 770, role: 'ML & Science page — sklearn API, train/test split, dummy baseline, leakage' },
  { path: 'frontend/src/pages/Charts.jsx',     lines: 259, role: 'Demand Patterns — hourly, monthly, seasonal, weekday charts' },
  { path: 'frontend/src/pages/About.jsx',      lines: 155, role: 'Dataset background, column reference, station map' },
  { path: 'frontend/src/index.css',            lines: 700, role: 'Single CSS file — all design tokens, layouts, components' },
]

const DECISIONS = [
  {
    title: 'XGBoost over simpler models',
    color: '#c0392b',
    why: 'A Decision Tree hit R² = 0.887 — good, but XGBoost reached 0.955 (+7.6 pp) by learning non-linear interactions like rush hour × workday and temperature × season that a single tree misses.',
  },
  {
    title: 'scikit-learn Pipeline to prevent data leakage',
    color: '#2980b9',
    why: 'StandardScaler must only see training data. Wrapping it in a Pipeline ensures .fit() is called only on X_train — never on test rows — so the reported R² / accuracy is an honest out-of-sample estimate.',
  },
  {
    title: 'Lasso + Pearson two-filter selection',
    color: '#27ae60',
    why: 'Running both filters on the training split caught any feature that Lasso zeroed out but still carries a linear signal (or vice versa). All 23 survived, confirming every engineered feature adds value.',
  },
  {
    title: '85 / 15 train-test split (random_state = 42)',
    color: '#e67e22',
    why: '15 % gives 2,607 test rows — large enough for stable metric estimates while leaving 14,772 for training. random_state = 42 pins the exact rows so results are fully reproducible across runs.',
  },
  {
    title: 'Cyclic encoding for hour and month',
    color: '#8e44ad',
    why: 'Hour 23 and hour 0 are adjacent in reality but 23 apart numerically. sin/cos encoding preserves that continuity: the model sees midnight as a smooth transition, not a cliff-edge feature boundary.',
  },
  {
    title: 'Render + Vercel free-tier deployment',
    color: '#6c757d',
    why: 'Vercel serves the static React build globally with zero config. Render hosts the Python API for free — the only trade-off is a ~30s cold start after 15 min of inactivity (free tier sleep).',
  },
]

// ── Flowchart node helpers ────────────────────────────────────────────────────
const NODE_W = 148
const NODE_H = 62

function RectNode({ icon, label, sub, color, bg }) {
  return (
    <div style={{
      width: NODE_W, minHeight: NODE_H,
      border: `2px solid ${color}`, borderRadius: 8,
      background: bg || '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '8px 10px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      {icon && <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{icon}</div>}
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color, lineHeight: 1.25 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 3, lineHeight: 1.2 }}>{sub}</div>}
    </div>
  )
}

function OvalNode({ icon, label, sub, color }) {
  return (
    <div style={{
      width: NODE_W, minHeight: NODE_H,
      border: `2px solid ${color}`, borderRadius: 32,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '8px 10px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      {icon && <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{icon}</div>}
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color, lineHeight: 1.25 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 3, lineHeight: 1.2 }}>{sub}</div>}
    </div>
  )
}

function Arrow({ label, dir = 'right' }) {
  const isRight = dir === 'right'
  const isLeft  = dir === 'left'
  const isDown  = dir === 'down'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isDown ? 'column' : 'row',
      alignItems: 'center', justifyContent: 'center',
      gap: 3,
      color: '#999', fontSize: '0.65rem',
      flexShrink: 0,
      ...(isDown ? { height: 44 } : { width: 56 }),
    }}>
      {isLeft  && <span style={{ fontSize: '0.9rem' }}>←</span>}
      {isDown  && <div style={{ width: 1, flex: 1, background: '#ccc', margin: '0 auto' }} />}
      {label && <span style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{label}</span>}
      {isRight && <span style={{ fontSize: '0.9rem' }}>→</span>}
      {isDown  && <span style={{ fontSize: '0.9rem', textAlign: 'center' }}>↓</span>}
    </div>
  )
}

// ── Architecture diagram ──────────────────────────────────────────────────────
function ArchDiagram() {
  const AMBER  = '#f39c12'
  const BLUE   = '#2980b9'
  const GREY   = '#6c757d'
  const RED    = '#c0392b'
  const GREEN  = '#27ae60'
  const PURPLE = '#8e44ad'

  return (
    <div style={{ overflowX: 'auto', padding: '4px 0' }}>

      {/* ── Offline subgraph ── */}
      <div style={{
        border: `2px dashed ${AMBER}`, borderRadius: 12,
        background: '#fef9e7', padding: '14px 18px',
        marginBottom: 0,
      }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: AMBER, marginBottom: 12,
        }}>
          🧪 Offline — done once (local machine)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'nowrap' }}>
          <RectNode icon="📦" label="Capital Bikeshare" sub="hour.csv · 17,379 rows" color={GREY} />
          <Arrow label="clean" />
          <RectNode icon="🔧" label="Feature Engineering" sub="23 features selected" color={RED} />
          <Arrow label="Lasso + Pearson" />
          <RectNode icon="🤖" label="Train XGBoost" sub="Classifier + Regressor" color={RED} />
          <Arrow label="serialize" />
          <RectNode icon="💾" label="classifier.pkl" sub="regressor.pkl" color={GREY} bg="#f8f9fa" />
        </div>
      </div>

      {/* Cross-zone connector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 18 + NODE_W / 2 + 6, margin: '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, height: 28, background: '#ccc' }} />
          <div style={{ fontSize: '0.62rem', color: '#aaa', whiteSpace: 'nowrap', margin: '1px 0' }}>loaded at startup</div>
          <div style={{ fontSize: '0.85rem', color: '#ccc' }}>↓</div>
        </div>
      </div>

      {/* ── Runtime subgraph ── */}
      <div style={{
        border: `2px dashed ${BLUE}`, borderRadius: 12,
        background: '#eaf4fb', padding: '14px 18px',
        marginTop: 0,
      }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: BLUE, marginBottom: 12,
        }}>
          ☁️ Runtime — live app
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'nowrap' }}>
          <OvalNode icon="🌤️" label="Open-Meteo API" sub="live weather" color={PURPLE} />
          <Arrow label="live weather" />
          <RectNode icon="🖥️" label="React Frontend" sub="Vercel.com" color={BLUE} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 56, flexShrink: 0 }}>
            <div style={{ fontSize: '0.65rem', color: '#999', textAlign: 'center', whiteSpace: 'nowrap' }}>date + inputs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '0.9rem', color: '#999' }}>→</span>
              <span style={{ fontSize: '0.9rem', color: '#999' }}>←</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#999', textAlign: 'center', whiteSpace: 'nowrap' }}>prediction</div>
          </div>
          <RectNode icon="⚙️" label="FastAPI Backend" sub="Render.com" color={GREEN} />
          <Arrow label="" />
          <OvalNode icon="🙋" label="User" color={GREY} />
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 8, textAlign: 'right' }}>
        .pkl files are committed to GitHub and loaded by FastAPI on every Render startup
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Architecture() {
  return (
    <div>
      {/* Metric strip */}
      <div className="grid-5" style={{ marginBottom: 22 }}>
        {STATS.map(s => (
          <div className="metric-card" key={s.label}>
            <div className="m-label">{s.label}</div>
            <div className="m-value">{s.value}</div>
            <div className="m-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 1. Architecture diagram ── */}
      <div className="card">
        <div className="section-title">System architecture</div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
          Training is done <strong>once offline</strong> on a local machine. The serialised model files are committed
          to GitHub and loaded by the FastAPI backend at startup on Render. The React frontend on Vercel
          fetches live weather from Open-Meteo and sends user inputs to the backend for inference.
        </p>
        <ArchDiagram />
      </div>

      {/* ── 2. Written explanation ── */}
      <div className="card">
        <div className="section-title">Written explanation</div>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: '#444' }}>
          Both models — an XGBoost Classifier (predicting demand level) and an XGBoost Regressor
          (predicting hourly rental count) — are trained <strong>offline, once</strong>, on a local
          machine using the Capital Bikeshare dataset (17,379 rows, 2011–2012). Training applies Lasso
          and Pearson feature selection and fits scikit-learn Pipelines (StandardScaler → XGBoost), then
          serialises the fitted pipelines to <code>classifier.pkl</code> and <code>regressor.pkl</code>.
        </p>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: '#444', marginTop: 10 }}>
          These model files are committed to GitHub and <strong>loaded by the FastAPI backend at startup
          on Render.com</strong> — no training ever happens at runtime. When a user opens the React
          frontend (hosted on Vercel), they select a date and weather conditions; the frontend also
          fetches live weather from the Open-Meteo API to auto-fill those inputs. The user's inputs are
          sent to the FastAPI backend, which runs both models and returns the predicted demand level and
          hourly rental count — <strong>inference happens entirely in the backend, on every prediction
          request</strong>.
        </p>
      </div>

      {/* ── 3. Tech stack ── */}
      <div className="card">
        <div className="section-title">Tech stack</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {STACK.map(group => (
            <div key={group.group}>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: group.color,
                borderBottom: `2px solid ${group.color}22`, paddingBottom: 6, marginBottom: 10,
              }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(item => (
                  <div key={item.name} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: '0.88rem' }}>
                    <code style={{
                      background: group.color + '15', color: group.color,
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.82rem',
                      fontWeight: 700, whiteSpace: 'nowrap', minWidth: 180,
                    }}>
                      {item.name}
                    </code>
                    <span style={{ color: '#555' }}>{item.role}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Key source files ── */}
      <div className="card">
        <div className="section-title">Key source files</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th style={{ textAlign: 'right', width: 70 }}>Lines</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {FILES.map(f => (
                <tr key={f.path}>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: '#f8f9fa', padding: '2px 6px', borderRadius: 4 }}>
                      {f.path}
                    </code>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: '#888' }}>{f.lines}</td>
                  <td style={{ fontSize: '0.85rem', color: '#555' }}>{f.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Key engineering decisions ── */}
      <div className="card">
        <div className="section-title">Key engineering decisions</div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
          The choices below shaped the model's accuracy and the app's reliability — each has a concrete reason.
        </p>
        <div className="grid-2" style={{ gap: 16 }}>
          {DECISIONS.map(d => (
            <div key={d.title} className="method-box" style={{ borderColor: d.color }}>
              <div className="method-title" style={{ color: d.color }}>{d.title}</div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#444', marginTop: 6 }}>{d.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. Deployment workflow ── */}
      <div className="card">
        <div className="section-title">Deployment workflow</div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
          Every code change follows the same path from local edit to live app — no manual steps after the initial setup.
        </p>
        <div className="step-list">
          {[
            ['Edit code locally',      'Make changes to frontend (React) or backend (FastAPI) in the local dev environment. Frontend runs on Vite (localhost:5173), backend on uvicorn (localhost:8000).'],
            ['git push to GitHub',     'Push to the master branch on GitHub. This is the only manual deployment trigger — both platforms watch this branch.'],
            ['Vercel auto-deploys',    'Vercel detects the push, runs cd frontend && npm run build, and publishes the new static bundle to its global CDN. Typically live within ~30 seconds.'],
            ['Render auto-deploys',    'Render detects the push, installs api/requirements.txt, and restarts uvicorn with the new code. Python 3.11 is pinned via .python-version for fast wheel installs (~90s total build).'],
            ['Live on both platforms', 'Frontend at vercel.app URL, backend at bike-rental-demand.onrender.com. VITE_API_URL env var in Vercel settings points the frontend at the Render API.'],
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

      {/* ── 7. Mermaid source ── */}
      <div className="card">
        <div className="section-title">Mermaid diagram source</div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          The flowchart above rendered as Mermaid markup — paste into <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" style={{ color: '#2980b9' }}>mermaid.live</a> to regenerate.
        </p>
        <pre style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, fontSize: '0.82rem', lineHeight: 1.6, overflowX: 'auto', color: '#333' }}>{`flowchart LR
    subgraph Offline["🧪 Offline — done once (local machine)"]
        RAW[("📦 Capital Bikeshare\\nhour.csv · 17,379 rows")]
        CLEAN["🔧 Clean &\\nFeature Engineering"]
        TRAIN["🤖 Train XGBoost\\nClassifier + Regressor"]
        MODEL["💾 classifier.pkl\\nregressor.pkl"]
        RAW --> CLEAN --> TRAIN --> MODEL
    end

    subgraph Runtime["☁️ Runtime — live app"]
        WEATHER(["🌤️ Open-Meteo\\nWeather API"])
        BACKEND["⚙️ FastAPI Backend\\nRender.com\\nLoads models at startup"]
        FRONTEND["🖥️ React Frontend\\nVercel.com"]
        USER(["🙋 User"])

        WEATHER -->|"live weather"| FRONTEND
        USER --> FRONTEND
        FRONTEND -->|"date + weather inputs"| BACKEND
        BACKEND -->|"demand prediction"| FRONTEND
    end

    MODEL -->|"loaded at startup"| BACKEND

    style Offline fill:#fef9e7,stroke:#f39c12,stroke-width:2px
    style Runtime fill:#eaf4fb,stroke:#2980b9,stroke-width:2px`}</pre>
      </div>
    </div>
  )
}
