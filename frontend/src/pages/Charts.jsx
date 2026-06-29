import { useEffect, useState } from 'react'
import {
  LineChart, Line, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const RED    = '#c0392b'
const BLUE   = '#2980b9'

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

  const sMax = data.seasonal_box[0]?.max_val ?? 1000
  const wMax = data.weather_box[0]?.max_val  ?? 1000

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

    </div>
  )
}
