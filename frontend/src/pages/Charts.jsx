import { useEffect, useState } from 'react'
import {
  LineChart, AreaChart, Area, BarChart, ScatterChart, Scatter,
  Line, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts'

const RED     = '#c0392b'
const BLUE    = '#2980b9'
const GREEN   = '#27ae60'
const ORANGE  = '#e67e22'
const PURPLE  = '#8e44ad'
const TEAL    = '#16a085'

// Box plot colours per season / weather (matching the Streamlit matplotlib style)
const SEASON_FILL = {
  Spring: '#9ecae1',
  Summer: '#2c6fad',
  Autumn: '#d2703c',
  Winter: '#bdd7e7',
}
const WEATHER_FILL = {
  'Clear':       '#c0392b',
  'Mist/Cloudy': '#2980b9',
  'Rain/Snow':   '#e67e22',
}

// ── Custom Box Plot shape rendered inside a Recharts Bar ────────────────────
//
// Recharts passes: x, y, width, height, payload
//   • dataKey is set to "max_val" so every bar spans 0 → global max
//   • y         = pixel y of max_val (top of bar area)
//   • y+height  = pixel y of 0 (chart bottom baseline)
//   • pxOf(v)   = linear interpolation to any value in [0, max_val]
//
const BoxShape = (props) => {
  const { x, y, width, height, payload } = props
  if (!payload || height <= 0) return null

  const { q1, q3, median, whiskerLow, whiskerHigh, outliers, max_val, season, label } = payload
  const fill = SEASON_FILL[season] || WEATHER_FILL[label] || RED

  const bottom = y + height
  const pxOf = (val) => bottom - (val / max_val) * height

  const bx    = x + width * 0.15
  const bw    = width * 0.70
  const cx    = x + width / 2
  const capHW = bw * 0.28

  return (
    <g>
      {/* Upper whisker stem + cap */}
      <line x1={cx} x2={cx} y1={pxOf(q3)} y2={pxOf(whiskerHigh)} stroke="#555" strokeWidth={1.5} />
      <line x1={cx - capHW} x2={cx + capHW} y1={pxOf(whiskerHigh)} y2={pxOf(whiskerHigh)} stroke="#555" strokeWidth={1.5} />

      {/* Box Q1→Q3 */}
      <rect
        x={bx} y={pxOf(q3)}
        width={bw} height={pxOf(q1) - pxOf(q3)}
        fill={fill} fillOpacity={0.72}
        stroke={fill} strokeWidth={1.5}
        rx={2}
      />

      {/* Median line */}
      <line
        x1={bx} x2={bx + bw}
        y1={pxOf(median)} y2={pxOf(median)}
        stroke="#1a1a1a" strokeWidth={2.5}
      />

      {/* Lower whisker stem + cap */}
      <line x1={cx} x2={cx} y1={pxOf(q1)} y2={pxOf(whiskerLow)} stroke="#555" strokeWidth={1.5} />
      <line x1={cx - capHW} x2={cx + capHW} y1={pxOf(whiskerLow)} y2={pxOf(whiskerLow)} stroke="#555" strokeWidth={1.5} />

      {/* Outlier dots */}
      {outliers && outliers.map((val, i) => (
        <circle
          key={i}
          cx={cx}
          cy={pxOf(val)}
          r={2.2}
          fill="none"
          stroke="#777"
          strokeWidth={0.9}
          opacity={0.65}
        />
      ))}
    </g>
  )
}

// ── Custom tooltip ──────────────────────────────────────────────────────────
const BoxTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null
  const d = payload[0].payload
  const name = d.season || d.label
  const rows = [
    ['Max',           d.max],
    ['Upper whisker', d.whiskerHigh],
    ['Q3 (75 %)',     d.q3],
    ['Median',        d.median],
    ['Mean',          d.mean],
    ['Q1 (25 %)',     d.q1],
    ['Lower whisker', d.whiskerLow],
    ['Min',           d.min],
  ]
  return (
    <div style={{
      background: 'white', border: '1px solid #ddd', borderRadius: 8,
      padding: '10px 14px', fontSize: '0.82rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>{name}</div>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, val]) => (
            <tr key={label}>
              <td style={{ color: '#888', paddingRight: 14, paddingBottom: 3 }}>{label}</td>
              <td style={{ fontWeight: 600, textAlign: 'right' }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ color: '#aaa', marginTop: 6, fontSize: '0.75rem' }}>
        {d.outliers ? `${d.outliers.length} outlier points shown` : ''}
      </div>
    </div>
  )
}

// ── Section helpers ─────────────────────────────────────────────────────────
function ChartTitle({ children }) {
  return <div className="section-title" style={{ marginBottom: 6 }}>{children}</div>
}
function ChartNote({ children }) {
  return <p style={{ fontSize: '0.82rem', color: '#888', marginTop: 8, marginBottom: 20 }}>{children}</p>
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Charts() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch('/chart-data.json')
      .then(r => { if (!r.ok) throw new Error('chart-data.json not found'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="placeholder"><div className="placeholder-icon">&#x23F3;</div><p>Loading…</p></div>
  if (error)   return <div className="error-box">{error}</div>

  const sMax         = data.seasonal_box?.[0]?.max_val ?? 1000
  const wMax         = data.weather_box?.[0]?.max_val  ?? 1000
  const monthly      = data.monthly       || []
  const weekday      = data.weekday       || []
  const hourlyUsers  = data.hourly_users  || []
  const tempDemand   = data.temp_vs_demand || []

  return (
    <div>

      {/* ── Chart 1: Hourly line ── */}
      <div className="card">
        <ChartTitle>Average hourly rentals by time of day</ChartTitle>
        <ChartNote>
          Working days show the classic commuter double-peak (8 am and 5–6 pm).
          Weekends build gradually to a midday leisure peak.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.hourly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="hr"
                tickFormatter={v => `${v}:00`}
                interval={2}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip
                formatter={(v, name) => [`${v} bikes/hr`, name]}
                labelFormatter={v => `${v}:00`}
              />
              <Legend />
              <Line
                type="monotone" dataKey="workday" stroke={RED}
                name="Working day" dot={false} strokeWidth={2.5}
                isAnimationActive={false}
              />
              <Line
                type="monotone" dataKey="weekend" stroke={BLUE}
                name="Weekend" dot={false} strokeWidth={2.5} strokeDasharray="5 3"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 2: Seasonal box plot ── */}
      <div className="card">
        <ChartTitle>Demand by season — Washington D.C.</ChartTitle>
        <ChartNote>
          Box = Q1 → Q3 · thick line = median · whiskers = 1.5 × IQR · dots = outliers.
          Autumn peaks highest; Spring shows the lightest and most skewed demand.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={data.seasonal_box} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="season" tick={{ fontSize: 13 }} />
              <YAxis
                domain={[0, Math.ceil(sMax * 1.04)]}
                tick={{ fontSize: 12 }}
                unit=" bikes"
                width={72}
                label={{ value: 'Rentals / hour', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 11, fill: '#999' } }}
              />
              <Tooltip content={<BoxTooltip />} />
              <Bar
                dataKey="max_val"
                shape={<BoxShape />}
                isAnimationActive={false}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 3: Weather box plot ── */}
      <div className="card">
        <ChartTitle>Demand by weather condition</ChartTitle>
        <ChartNote>
          Clear skies produce nearly 3× the median demand of rain or snow.
          Mist/cloudy conditions sit between the two extremes.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data.weather_box} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 13 }} />
              <YAxis
                domain={[0, Math.ceil(wMax * 1.04)]}
                tick={{ fontSize: 12 }}
                unit=" bikes"
                width={72}
                label={{ value: 'Rentals / hour', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 11, fill: '#999' } }}
              />
              <Tooltip content={<BoxTooltip />} />
              <Bar
                dataKey="max_val"
                shape={<BoxShape />}
                isAnimationActive={false}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 4: Monthly trend + year-over-year ── */}
      <div className="card">
        <ChartTitle>Monthly demand — seasonal arc &amp; year-over-year growth</ChartTitle>
        <ChartNote>
          Demand peaks in summer (Jun–Sep) and troughs in winter. 2012 saw roughly 50 % more
          rentals than 2011 across every month — system-wide growth as the network expanded.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip formatter={(v, name) => [`${v} bikes/hr`, name]} />
              <Legend />
              <Bar dataKey="avg_2011" name="2011 avg" fill={BLUE} fillOpacity={0.7} isAnimationActive={false} />
              <Bar dataKey="avg_2012" name="2012 avg" fill={RED}  fillOpacity={0.7} isAnimationActive={false} />
              <Line type="monotone" dataKey="avg" name="2-yr avg" stroke="#333" strokeWidth={2}
                dot={{ r: 3 }} strokeDasharray="5 3" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 5: Casual vs Registered by hour ── */}
      <div className="card">
        <ChartTitle>Casual vs Registered riders — by hour of day</ChartTitle>
        <ChartNote>
          Registered riders (commuters) drive the sharp 8 am and 5–6 pm peaks.
          Casual riders (tourists / leisure) ramp slowly and plateau through the afternoon.
          The two populations behave almost independently.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourlyUsers} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={RED}  stopOpacity={0.25} />
                  <stop offset="95%" stopColor={RED}  stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradCas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hr" tickFormatter={v => `${v}:00`} interval={2} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip labelFormatter={v => `${v}:00`} formatter={(v, name) => [`${v} bikes/hr`, name]} />
              <Legend />
              <Area type="monotone" dataKey="registered" name="Registered" stroke={RED}
                fill="url(#gradReg)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="casual" name="Casual" stroke={BLUE}
                fill="url(#gradCas)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 6: Day-of-week casual vs registered ── */}
      <div className="card">
        <ChartTitle>Average demand by day of week</ChartTitle>
        <ChartNote>
          Mid-week (Tue–Thu) shows the highest total demand driven by registered commuters.
          Weekends flip the composition: casual riders nearly triple their share while
          registered demand falls sharply.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekday} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip formatter={(v, name) => [`${v} bikes/hr`, name]} />
              <Legend />
              <Bar dataKey="avg_registered" name="Registered" stackId="a" fill={RED}  fillOpacity={0.8} isAnimationActive={false} />
              <Bar dataKey="avg_casual"     name="Casual"     stackId="a" fill={BLUE} fillOpacity={0.8} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 7: Temperature vs demand ── */}
      <div className="card">
        <ChartTitle>Temperature vs average hourly demand</ChartTitle>
        <ChartNote>
          Demand rises steeply from 0 °C to ~26 °C, then flattens or slightly dips above
          30 °C (heat discourages cycling). Temperature is among the strongest continuous
          predictors in the XGBoost model (corr with cnt ≈ +0.40).
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={tempDemand} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="temp_c" unit="°C" tick={{ fontSize: 12 }}
                label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -4, style: { fontSize: 11, fill: '#999' } }}
                height={40}
              />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip formatter={(v) => [`${v} bikes/hr`, 'Avg demand']} labelFormatter={v => `${v}°C`} />
              <Line type="monotone" dataKey="avg_cnt" name="avg_cnt" stroke={ORANGE}
                strokeWidth={3} dot={{ r: 3, fill: ORANGE }} isAnimationActive={false} />
              <ReferenceLine x={26} stroke="#aaa" strokeDasharray="4 3"
                label={{ value: 'Peak ~26°C', position: 'top', fontSize: 10, fill: '#999' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart 8: Feature correlation bar ── */}
      <CorrelationChart />

      {/* ── Chart 9: Feature-vs-feature heatmap ── */}
      <CorrelationHeatmap features={data.corr_features || []} matrix={data.corr_matrix || []} />

    </div>
  )
}

// ── Feature correlation chart (loads science-data.json) ──────────────────
function CorrelationChart() {
  const [features, setFeatures] = useState(null)
  useEffect(() => {
    fetch('/science-data.json').then(r => r.json()).then(d => setFeatures(d.features)).catch(() => {})
  }, [])
  if (!features) return null

  const FEATURE_LABELS = {
    rush_workday:  'Rush × workday',
    hr:            'Hour of day',
    hr_cos:        'Hour (cos)',
    hr_sin:        'Hour (sin)',
    comfort:       'Comfort index',
    temp:          'Temperature',
    temp_workday:  'Temp × workday',
    mnth:          'Month',
    mnth_cos:      'Month (cos)',
    mnth_sin:      'Month (sin)',
    season:        'Season',
    peak_season:   'Peak season',
    yr:            'Year (2011/12)',
    weathersit:    'Weather code',
    bad_weather:   'Bad weather',
    windspeed:     'Wind speed',
    hum:           'Humidity',
    rush_hour:     'Rush hour',
    is_weekend:    'Is weekend',
    is_night:      'Is night',
    weekday:       'Weekday',
    weekday_cos:   'Weekday (cos)',
    weekday_sin:   'Weekday (sin)',
    holiday:       'Holiday',
  }

  const sorted = [...features]
    .sort((a, b) => b.corr_cnt - a.corr_cnt)
    .map(f => ({ ...f, label: FEATURE_LABELS[f.name] || f.name }))

  const CustomBar = (props) => {
    const { x, y, width, height, payload } = props
    return <rect x={x} y={y} width={width} height={height}
      fill={payload.corr_cnt >= 0 ? RED : BLUE} fillOpacity={0.75} rx={2} />
  }

  return (
    <div className="card">
      <ChartTitle>Feature correlations with rental count (Pearson r)</ChartTitle>
      <ChartNote>
        All 23 engineered features sorted by Pearson correlation with cnt.
        Orange = positive (more → more bikes), blue = negative. The strongest single
        predictor is <b>rush_workday</b> (rush hour on a working day) at r ≈ +0.58.
      </ChartNote>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.8rem', color: '#555' }}>
          <span style={{ display:'inline-block', width:12, height:12, background: RED, opacity:.75, borderRadius:2, marginRight:5, verticalAlign:'middle' }} />
          Positive (boosts demand)
        </span>
        <span style={{ fontSize: '0.8rem', color: '#555' }}>
          <span style={{ display:'inline-block', width:12, height:12, background: BLUE, opacity:.75, borderRadius:2, marginRight:5, verticalAlign:'middle' }} />
          Negative (reduces demand)
        </span>
      </div>
      <div className="chart-wrap" style={{ height: 480 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 40, left: 110, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" domain={[-0.55, 0.65]} tickFormatter={v => v.toFixed(1)}
              tick={{ fontSize: 11 }} label={{ value: 'Pearson r', position: 'insideBottom', offset: -2, style: { fontSize: 11, fill: '#999' } }} height={30} />
            <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v.toFixed(3), 'Correlation with cnt']} />
            <ReferenceLine x={0} stroke="#999" strokeWidth={1} />
            <Bar dataKey="corr_cnt" isAnimationActive={false} shape={<CustomBar />} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Feature-vs-feature correlation heatmap ────────────────────────────────
const FEAT_LABELS = {
  rush_workday:'rush×workday', hr:'hour', yr:'year', hr_cos:'hr(cos)',
  hr_sin:'hr(sin)', season:'season', temp:'temp', mnth:'month',
  comfort:'comfort', temp_workday:'temp×wday', mnth_cos:'mnth(cos)',
  mnth_sin:'mnth(sin)', peak_season:'peak ssn', weathersit:'weather',
  bad_weather:'bad wthr', windspeed:'wind', hum:'humidity',
  rush_hour:'rush hr', is_weekend:'weekend', is_night:'night',
  weekday:'weekday', weekday_cos:'wday(cos)', weekday_sin:'wday(sin)',
}

function CorrelationHeatmap({ features, matrix }) {
  const [hover, setHover] = useState(null)
  if (!features.length || !matrix.length) return null

  const n    = features.length
  const CELL = 26
  const PAD  = 80  // left label space
  const TOP  = 80  // top label space
  const W    = PAD + n * CELL
  const H    = TOP + n * CELL

  const rToColor = (r) => {
    if (r === null) return '#f8f9fa'
    const abs = Math.abs(r)
    if (r > 0) return `rgba(192,57,43,${0.08 + abs * 0.92})`
    return `rgba(41,128,185,${0.08 + abs * 0.92})`
  }

  const lookup = {}
  matrix.forEach(d => { lookup[`${d.row}|${d.col}`] = d.r })

  return (
    <div className="card">
      <ChartTitle>Feature correlation matrix (23 × 23)</ChartTitle>
      <ChartNote>
        Pearson r between every pair of engineered features. Red = positive correlation,
        blue = negative. Strong diagonals reveal redundant features (e.g. hr_sin / hr_cos).
        The lower triangle mirrors the upper — only one is shown.
      </ChartNote>
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block', margin: '0 auto', fontSize: 9 }}>
          {/* Column labels (rotated) */}
          {features.map((f, j) => (
            <text key={f}
              x={PAD + j * CELL + CELL / 2} y={TOP - 4}
              textAnchor="start" fontSize={8.5} fill="#555"
              transform={`rotate(-45, ${PAD + j * CELL + CELL / 2}, ${TOP - 4})`}
            >
              {FEAT_LABELS[f] || f}
            </text>
          ))}
          {/* Row labels + cells */}
          {features.map((fi, i) => (
            <g key={fi}>
              <text x={PAD - 4} y={TOP + i * CELL + CELL * 0.65}
                textAnchor="end" fontSize={8.5} fill="#555">
                {FEAT_LABELS[fi] || fi}
              </text>
              {features.map((fj, j) => {
                const r = lookup[`${fi}|${fj}`]
                const isHovered = hover && hover.fi === fi && hover.fj === fj
                return (
                  <rect key={fj}
                    x={PAD + j * CELL} y={TOP + i * CELL}
                    width={CELL - 1} height={CELL - 1}
                    fill={rToColor(r)}
                    stroke={isHovered ? '#333' : 'none'} strokeWidth={1.5}
                    rx={2}
                    onMouseEnter={() => r !== null && setHover({ fi, fj, r })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: r !== null ? 'crosshair' : 'default' }}
                  />
                )
              })}
            </g>
          ))}
          {/* Hover label */}
          {hover && (
            <text x={PAD} y={H - 4} fontSize={10} fill="#333" fontWeight={600}>
              {(FEAT_LABELS[hover.fi] || hover.fi)} × {(FEAT_LABELS[hover.fj] || hover.fj)}: r = {hover.r.toFixed(3)}
            </text>
          )}
        </svg>
      </div>
      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12, fontSize: '0.75rem', color: '#666' }}>
        <span>−1.0 strong negative</span>
        <svg width={160} height={14}>
          <defs>
            <linearGradient id="heatGrad">
              <stop offset="0%"   stopColor="rgba(41,128,185,1)" />
              <stop offset="50%"  stopColor="rgba(248,249,250,1)" />
              <stop offset="100%" stopColor="rgba(192,57,43,1)" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={160} height={14} fill="url(#heatGrad)" rx={3} />
        </svg>
        <span>+1.0 strong positive</span>
      </div>
    </div>
  )
}
