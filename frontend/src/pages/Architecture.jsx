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

// ── Architecture diagram (SVG) ────────────────────────────────────────────────
function ArchDiagram() {
  const AMBER  = '#e67e22'
  const BLUE   = '#2980b9'
  const GREY   = '#6c757d'
  const RED    = '#c0392b'
  const GREEN  = '#27ae60'
  const PURPLE = '#8e44ad'

  const W = 820
  const H = 418

  // Arrowhead marker
  const Marker = ({ id, color }) => (
    <marker id={id} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
      <polygon points="0 0, 9 3.5, 0 7" fill={color} />
    </marker>
  )

  // Rect node
  const N = ({ x, y, w, h = 68, color, title, sub }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8}
        fill="white" stroke={color} strokeWidth="2.5" filter="url(#sh)" />
      <text x={x + w / 2} y={sub ? y + h / 2 - 4 : y + h / 2 + 5}
        textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="sans-serif">
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 13}
          textAnchor="middle" fontSize="10.5" fill="#888" fontFamily="sans-serif">
          {sub}
        </text>
      )}
    </g>
  )

  // Pill node (external services)
  const Pill = ({ x, y, w, h = 68, color, title, sub }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2}
        fill="white" stroke={color} strokeWidth="2.5" filter="url(#sh)" />
      <text x={x + w / 2} y={sub ? y + h / 2 - 4 : y + h / 2 + 5}
        textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="sans-serif">
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 13}
          textAnchor="middle" fontSize="10.5" fill="#888" fontFamily="sans-serif">
          {sub}
        </text>
      )}
    </g>
  )

  // Arrow label badge: white pill bg + italic text — always readable regardless of what's behind it
  const Lbl = ({ cx, cy, label, color }) => {
    const bw = Math.round(label.length * 5.8 + 14)
    return (
      <g>
        <rect x={cx - bw / 2} y={cy - 12} width={bw} height={16}
          fill="white" fillOpacity="0.95" stroke={color} strokeWidth="0.8"
          strokeOpacity="0.35" rx="3" />
        <text x={cx} y={cy} textAnchor="middle"
          fontSize="10" fill={color} fontFamily="sans-serif" fontStyle="italic">
          {label}
        </text>
      </g>
    )
  }

  // Straight arrow (no label — use Lbl separately for precise placement)
  const Line = ({ x1, y1, x2, y2, color, mid }) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth="2" markerEnd={`url(#ah-${mid})`} />
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ maxWidth: W, display: 'block', margin: '0 auto' }}>
        <defs>
          <filter id="sh" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000015" />
          </filter>
          <Marker id="ah-grey"   color={GREY}   />
          <Marker id="ah-red"    color={RED}    />
          <Marker id="ah-green"  color={GREEN}  />
          <Marker id="ah-blue"   color={BLUE}   />
          <Marker id="ah-purple" color={PURPLE} />
        </defs>

        {/* ══ OFFLINE ZONE  y=10..182 ══════════════════════════════════════════ */}
        <rect x="10" y="10" width="800" height="172" rx="12"
          fill="#fff8ee" stroke={AMBER} strokeWidth="2.5" strokeDasharray="8,5" />
        <text x="26" y="32" fontSize="10" fontWeight="700" fill={AMBER}
          letterSpacing="1.2" fontFamily="sans-serif">
          🧪  OFFLINE — DONE ONCE (LOCAL MACHINE)
        </text>

        {/* Offline nodes  —  centered at y=95  (y=61..129) */}
        <N x={22}  y={61} w={130} color={GREY} title="hour.csv"            sub="17,379 rows" />
        <N x={207} y={61} w={150} color={RED}  title="Feature Engineering" sub="23 features" />
        <N x={415} y={61} w={160} color={RED}  title="Train XGBoost"       sub="Classifier + Regressor" />
        <N x={635} y={61} w={135} color={GREY} title=".pkl files"          sub="classifier + regressor" />

        {/*
          Arrow labels are placed ABOVE the nodes (y=50) — in the clear header band —
          so they never overlap node titles (nodes start at y=61).
        */}

        {/* hour.csv → Feature Engineering  (gap x=152..207, mid x=179) */}
        <Line x1={154} y1={95} x2={203} y2={95} color={GREY} mid="grey" />
        <Lbl  cx={179} cy={50} label="clean + engineer" color={GREY} />

        {/* Feature Engineering → Train XGBoost  (gap x=357..415, mid x=386) */}
        <Line x1={359} y1={95} x2={411} y2={95} color={RED} mid="red" />
        <Lbl  cx={386} cy={50} label="select features" color={RED} />

        {/* Train → .pkl  (gap x=575..635, mid x=605) */}
        <Line x1={577} y1={95} x2={631} y2={95} color={GREY} mid="grey" />
        <Lbl  cx={605} cy={50} label="serialize" color={GREY} />

        {/* ── Cross-zone connector  .pkl → FastAPI ─────────────────────────── */}
        {/* .pkl center x=702, bottom y=129 → down to y=184 → left to x=281 → FastAPI top y=206 */}
        <path d="M 702,129 L 702,186 L 281,186 L 281,208"
          stroke={GREY} strokeWidth="2" fill="none"
          strokeDasharray="7,4" markerEnd="url(#ah-grey)" />
        {/* Label sits on the horizontal segment (y=186), with white bg so it's crisp */}
        <Lbl cx={492} cy={186} label="loaded at startup" color={GREY} />

        {/* ══ RUNTIME ZONE  y=196..408 ═════════════════════════════════════════ */}
        <rect x="10" y="196" width="800" height="212" rx="12"
          fill="#eaf4fb" stroke={BLUE} strokeWidth="2.5" strokeDasharray="8,5" />
        <text x="26" y="217" fontSize="10" fontWeight="700" fill={BLUE}
          letterSpacing="1.2" fontFamily="sans-serif">
          ☁️  RUNTIME — LIVE APP
        </text>

        {/* Runtime main row  —  centered at y=262  (y=228..296) */}
        <N    x={22}  y={228} w={118} color={GREY}   title="GitHub"         sub="source of truth" />
        <N    x={195} y={220} w={158} h={84} color={GREEN}  title="FastAPI" sub="Render.com" />
        <N    x={415} y={228} w={148} color={BLUE}   title="React Frontend" sub="Vercel.com" />
        <Pill x={625} y={228} w={112} color={GREY}   title="User" />

        {/* Open-Meteo below React  (y=326..380) */}
        <Pill x={415} y={326} w={148} h={54} color={PURPLE} title="Open-Meteo" sub="weather API" />

        {/*
          Arrow labels use Lbl badges (white bg + thin colored border) — placed
          above their respective arrows so they never overlap node text.
        */}

        {/* GitHub → FastAPI  (gap x=140..195, mid x=167)  */}
        <Line x1={142} y1={262} x2={191} y2={262} color={GREY}  mid="grey"  />
        <Lbl  cx={167} cy={251} label="auto-deploy" color={GREY} />

        {/* FastAPI → React  prediction  (upper track, y=248)  gap x=353..415 mid x=384 */}
        <Line x1={355} y1={248} x2={411} y2={248} color={GREEN} mid="green" />
        <Lbl  cx={384} cy={237} label="prediction" color={GREEN} />

        {/* React → FastAPI  inputs  (lower track, y=276)  gap mid x=384 */}
        <Line x1={413} y1={276} x2={357} y2={276} color={BLUE}  mid="blue"  />
        <Lbl  cx={384} cy={289} label="date + inputs" color={BLUE} />

        {/* User → React  (gap x=563..625 mid x=594) */}
        <Line x1={623} y1={262} x2={567} y2={262} color={GREY}  mid="grey"  />
        <Lbl  cx={594} cy={251} label="uses" color={GREY} />

        {/* Open-Meteo → React  vertical  x=489  gap y=326..296 mid y=311 */}
        <Line x1={489} y1={326} x2={489} y2={298} color={PURPLE} mid="purple" />
        {/* Label to the right of the arrow so it doesn't clash with anything */}
        <Lbl  cx={543} cy={314} label="live weather" color={PURPLE} />

      </svg>
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
