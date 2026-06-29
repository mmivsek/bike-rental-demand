import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const RED    = '#c0392b'
const BLUE   = '#2980b9'
const ORANGE = '#e67e22'

const SEASON_COLORS = ['#27ae60', '#c0392b', '#e67e22', '#2980b9']

function ChartTitle({ children }) {
  return <div className="section-title" style={{ marginBottom: 6 }}>{children}</div>
}

function ChartNote({ children }) {
  return <p style={{ fontSize: '0.82rem', color: '#888', marginTop: 8, marginBottom: 20 }}>{children}</p>
}

export default function Charts() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetch('/chart-data.json')
      .then(r => { if (!r.ok) throw new Error('chart-data.json not found'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="placeholder"><div className="placeholder-icon">&#x23F3;</div><p>Loading chart data…</p></div>
  if (error)   return <div className="error-box">{error}</div>

  return (
    <div>
      {/* Chart 1: Hourly demand */}
      <div className="card">
        <ChartTitle>Average hourly rentals by time of day</ChartTitle>
        <ChartNote>
          Working days show a clear commuter pattern (peaks at 8 am and 5–6 pm).
          Weekends peak in early afternoon — leisure rides, not commutes.
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

      {/* Chart 2: Seasonal */}
      <div className="card">
        <ChartTitle>Average demand by season</ChartTitle>
        <ChartNote>
          Summer and Autumn far outpace Winter. Spring shows moderate demand as the system grows in usage.
          Seasonal patterns are the strongest predictors after hour-of-day.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.seasonal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="season" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip formatter={v => [`${v} bikes/hr`, 'Avg rentals']} />
              <Bar dataKey="avg" name="Avg rentals/hr" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.seasonal.map((_, i) => (
                  <Cell key={i} fill={SEASON_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Weather */}
      <div className="card">
        <ChartTitle>Average demand by weather condition</ChartTitle>
        <ChartNote>
          Clear weather drives significantly more rentals than rain or snow.
          Bad weather (weathersit = 3) cuts demand nearly in half compared to clear skies.
        </ChartNote>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.weather} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" bikes" width={72} />
              <Tooltip formatter={v => [`${v} bikes/hr`, 'Avg rentals']} />
              <Bar dataKey="avg" name="Avg rentals/hr" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <Cell fill={RED} />
                <Cell fill={BLUE} />
                <Cell fill={ORANGE} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
