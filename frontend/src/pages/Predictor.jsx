import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { predict, predictDay } from '../lib/api.js'
import { fetchDCWeather, getDateType, fetchWeatherForDateTime } from '../lib/weather.js'
import { SEASON_NAMES, WEATHER_NAMES, WEEKDAY_NAMES } from '../lib/constants.js'

// ── Date helpers ─────────────────────────────────────────────────────────────
function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function strToDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function currentHour() { return new Date().getHours() }

function monthToSeason(month) {
  return { 3:1, 4:1, 5:1, 6:2, 7:2, 8:2, 9:3, 10:3, 11:3, 12:4, 1:4, 2:4 }[month]
}

function formatDateDisplay(d) {
  const day = WEEKDAY_NAMES[(d.getDay() + 6) % 7]
  return d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) + ` (${day})`
}

// ── Calendar day class ────────────────────────────────────────────────────────
function getDayClass(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fEnd = new Date(today)
  fEnd.setDate(today.getDate() + 16)
  if (d < today)  return 'cal-past'
  if (d > fEnd)   return 'cal-no-data'
  return 'cal-forecast'
}

// ── Slider ────────────────────────────────────────────────────────────────────
function Slider({ label, value, onChange, min, max, unit, step = 1, compact = false }) {
  return (
    <div className="form-group" style={compact ? { marginBottom: 4 } : undefined}>
      <label className="form-label" style={compact ? { fontSize: '0.72rem' } : undefined}>{label}</label>
      <div className="slider-row">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} />
        <span className="slider-val" style={compact ? { fontSize: '0.78rem', minWidth: 38 } : undefined}>{value}{unit}</span>
      </div>
    </div>
  )
}

// ── Weather info panel ────────────────────────────────────────────────────────
const WIP_META = {
  historical: { label: 'Historical record',      icon: '📜', color: '#27ae60', bg: '#eafaf1', border: '#27ae60', desc: 'Actual observed conditions' },
  current:    { label: 'Current conditions',     icon: '📍', color: '#2980b9', bg: '#e8f4fd', border: '#2980b9', desc: 'Live weather for Washington D.C.' },
  forecast:   { label: '16-day forecast',        icon: '🔭', color: '#8e44ad', bg: '#f4ecf7', border: '#8e44ad', desc: 'Model-based prediction' },
  'no-data':  { label: 'Beyond forecast window', icon: '❔', color: '#aaa',    bg: '#f8f9fa', border: '#ddd',    desc: 'No data available for this date' },
}
const WX_ICON = { 1: '☀️', 2: '🌥️', 3: '🌧️' }

function WeatherInfoPanel({ dateStr, hr, onApply }) {
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState(null)
  const onApplyRef = useRef(onApply)
  useEffect(() => { onApplyRef.current = onApply }, [onApply])

  const dateType = getDateType(dateStr)
  const meta     = WIP_META[dateType]

  useEffect(() => {
    setInfo(null)
    setErr(null)
    if (dateType === 'no-data') return

    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const w = await fetchWeatherForDateTime(dateStr, hr)
        setInfo(w)
        onApplyRef.current(w)
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [dateStr, hr, dateType])

  return (
    <div className="wip" style={{ borderLeftColor: meta.border, background: meta.bg }}>
      <div className="wip-head">
        <span className="wip-icon">{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <div className="wip-type" style={{ color: meta.color }}>{meta.label}</div>
          <div className="wip-desc">{meta.desc}</div>
        </div>
        {loading && <span className="wip-spin">⟳</span>}
      </div>

      {dateType === 'no-data' && (
        <p className="wip-note">
          Open-Meteo provides forecasts up to 16 days ahead.
          Select a date within the highlighted range to see weather data.
        </p>
      )}
      {err && !loading && (
        <p className="wip-note" style={{ color: '#c0392b' }}>{err}</p>
      )}
      {info && !loading && (
        <>
          <div className="wip-meta">
            📅 {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}
            {' '}at <b>{String(hr).padStart(2,'0')}:00</b>
            <span className="wip-meta-sep">·</span>
            📍 Washington D.C.
            <span className="wip-meta-sep">·</span>
            Source: <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="wip-src-link">Open-Meteo</a>
          </div>
          <div className="wip-grid">
            <div className="wip-cell">{WX_ICON[info.weathersit]} <span>{WEATHER_NAMES[info.weathersit]}</span></div>
            <div className="wip-cell">🌡️ <span><b>{info.tempC}</b> °C</span></div>
            <div className="wip-cell">💧 <span><b>{info.humPct}</b> %</span></div>
            <div className="wip-cell">🌬️ <span><b>{info.windKmh}</b> km/h</span></div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Context table ─────────────────────────────────────────────────────────────
function ContextTable({ selectedDate, hr, weathersit, tempC, humPct, windKmh, result }) {
  const season = monthToSeason(selectedDate.getMonth() + 1)
  return (
    <table className="ctx-table">
      <tbody>
        <tr><td>Date</td><td>{formatDateDisplay(selectedDate)}</td></tr>
        <tr><td>Hour</td><td>{String(hr).padStart(2,'0')}:00{result.is_rush ? ' — Rush hour' : ''}</td></tr>
        <tr><td>Day type</td><td>{result.is_workday ? 'Working day' : 'Weekend / Holiday'}</td></tr>
        <tr><td>Season</td><td>{SEASON_NAMES[season]}</td></tr>
        <tr><td>Weather</td><td>{WEATHER_NAMES[weathersit]}</td></tr>
        <tr><td>Temperature</td><td>{tempC} °C</td></tr>
        <tr><td>Humidity</td><td>{humPct} %</td></tr>
        <tr><td>Wind</td><td>{windKmh} km/h</td></tr>
      </tbody>
    </table>
  )
}

// ── Custom tooltip for the day forecast chart ─────────────────────────────────
function DayChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{`${String(label).padStart(2,'0')}:00`}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <b>{Math.round(p.value)}</b> bikes/hr
        </div>
      ))}
    </div>
  )
}

// ── Scenario colors ───────────────────────────────────────────────────────────
const SCENARIO_COLORS = ['#c0392b', '#2980b9', '#27ae60']
const SCENARIO_LABELS = ['Scenario A', 'Scenario B', 'Scenario C']

// ── Selected-hour label above the reference line ──────────────────────────────
function SelectedHourLabel({ viewBox, hr, date }) {
  if (!viewBox) return null
  const { x, y } = viewBox
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const hrStr  = `${String(hr).padStart(2, '0')}:00`
  const W = 86, H = 34
  return (
    <g>
      <rect x={x - W / 2} y={y - H - 6} width={W} height={H}
        fill="white" rx={5} stroke="#ccc" strokeWidth={1}
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
      />
      <text x={x} y={y - H + 12} textAnchor="middle" fontSize={9} fill="#888" fontFamily="inherit">
        {dayStr}
      </text>
      <text x={x} y={y - H + 27} textAnchor="middle" fontSize={13} fontWeight="800" fill="#1e2530" fontFamily="inherit">
        {hrStr}
      </text>
    </g>
  )
}

// ── Day forecast chart ────────────────────────────────────────────────────────
function DayForecastChart({ selectedDate, weathersit, tempC, humPct, windKmh, currentHr, comparisons = [], baseline }) {
  const [dayData, setDayData]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState(null)
  const [compResults, setCompResults] = useState({})
  const timerRef     = useRef(null)
  const compTimerRef = useRef(null)

  // Primary forecast
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true); setErr(null)
      try {
        const result = await predictDay({
          year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate(), hr: 12,
          weathersit, temp_c: tempC, hum_pct: humPct, wind_kmh: windKmh,
        })
        setDayData(result)
      } catch (e) { setErr(e.message) }
      finally { setLoading(false) }
    }, 600)
    return () => clearTimeout(timerRef.current)
  }, [selectedDate, weathersit, tempC, humPct, windKmh])

  // Comparison forecasts
  useEffect(() => {
    clearTimeout(compTimerRef.current)
    compTimerRef.current = setTimeout(async () => {
      if (!comparisons.length) { setCompResults({}); return }
      const results = {}
      await Promise.all(comparisons.map(async c => {
        try {
          const cDate = c.selectedDate instanceof Date ? c.selectedDate : selectedDate
          results[c.id] = await predictDay({
            year: cDate.getFullYear(), month: cDate.getMonth() + 1,
            day: cDate.getDate(), hr: 12,
            weathersit: c.weathersit, temp_c: c.tempC, hum_pct: c.humPct, wind_kmh: c.windKmh,
          })
        } catch {}
      }))
      setCompResults(results)
    }, 600)
    return () => clearTimeout(compTimerRef.current)
  }, [selectedDate, comparisons])

  const isWorkday = dayData ? dayData.is_workday : selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6
  const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const chartData = baseline?.map(b => {
    const row = { hr: b.hr, avg: isWorkday ? b.workday : b.weekend }
    if (dayData) {
      const h = dayData.hours.find(x => x.hr === b.hr)
      if (h) row.s0 = h.rental_count
    }
    comparisons.forEach(c => {
      const cr = compResults[c.id]
      if (cr) {
        const h = cr.hours.find(x => x.hr === b.hr)
        if (h) row[`s${c.id}`] = h.rental_count
      }
    })
    return row
  })

  return (
    <div className="card day-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Hourly demand forecast — {dateLabel}
        </div>
        {loading && <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Fetching…</span>}
      </div>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 12, marginTop: 2 }}>
        Dashed gray = historical average ({isWorkday ? 'working day' : 'weekend'}) · colored lines = model predictions
      </p>

      {err && (
        <div className="error-box" style={{ marginBottom: 8 }}>
          {err.includes('fetch') || err.includes('Failed')
            ? 'Start the FastAPI server on port 8000 to see predictions.'
            : err}
        </div>
      )}

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 46, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="hr" tickFormatter={v => `${v}:00`} interval={2} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" bikes" width={68} />
            <Tooltip content={<DayChartTooltip />} />
            <Legend />
            <ReferenceLine
              x={currentHr} stroke="#1e2530" strokeDasharray="5 3" strokeWidth={2}
              label={<SelectedHourLabel hr={currentHr} date={selectedDate} />}
            />
            <Line type="monotone" dataKey="avg"
              name={isWorkday ? 'Avg working day' : 'Avg weekend'}
              stroke="#aaa" strokeDasharray="5 3" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            {dayData && (
              <Line type="monotone" dataKey="s0"
                name={SCENARIO_LABELS[0]}
                stroke={SCENARIO_COLORS[0]} strokeWidth={2.5}
                strokeDasharray="none"
                dot={false} isAnimationActive={false} />
            )}
            {comparisons.map((c, i) => {
              // Each comparison gets a distinct dash pattern so overlapping lines stay visible
              const dashes = ['6 3', '2 3', '8 3 2 3']
              return compResults[c.id] ? (
                <Line key={c.id} type="monotone" dataKey={`s${c.id}`}
                  name={SCENARIO_LABELS[i + 1]}
                  stroke={SCENARIO_COLORS[i + 1]} strokeWidth={2.5}
                  strokeDasharray={dashes[i] ?? '6 3'}
                  dot={false} isAnimationActive={false} />
              ) : null
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Comparison scenario card ───────────────────────────────────────────────────
function ScenarioCard({ scenario, index, onUpdate, onRemove }) {
  const color = SCENARIO_COLORS[index + 1]
  const label = SCENARIO_LABELS[index + 1]
  const date  = scenario.selectedDate instanceof Date ? scenario.selectedDate : new Date(scenario.selectedDate)
  return (
    <div className="scenario-card" style={{ borderTopColor: color }}>
      <div className="scenario-card-head">
        <span className="scenario-dot" style={{ background: color }} />
        <span className="scenario-card-label">{label}</span>
        <button className="scenario-remove" onClick={onRemove} title="Remove">✕</button>
      </div>

      {/* Date + hour */}
      <div className="form-group" style={{ marginBottom: 6 }}>
        <label className="form-label" style={{ fontSize: '0.72rem' }}>Date</label>
        <DatePicker
          selected={date}
          onChange={d => d && onUpdate('selectedDate', d)}
          dateFormat="yyyy-MM-dd"
          dayClassName={getDayClass}
          wrapperClassName="dp-wrapper"
          className="dp-input dp-input-sm"
        />
      </div>
      <Slider label="Hour" value={scenario.hr ?? 12} onChange={v => onUpdate('hr', v)} min={0} max={23} unit=":00" compact />

      <div style={{ borderTop: '1px solid #eee', margin: '8px 0 6px' }} />

      <div className="form-group" style={{ marginBottom: 6 }}>
        <label className="form-label" style={{ fontSize: '0.72rem' }}>Weather</label>
        <select value={scenario.weathersit} onChange={e => onUpdate('weathersit', Number(e.target.value))}>
          <option value={1}>☀️  Clear / few clouds</option>
          <option value={2}>🌥️  Mist / Cloudy</option>
          <option value={3}>🌧️  Light Rain or Snow</option>
        </select>
      </div>
      <Slider label="Temperature" value={scenario.tempC}   onChange={v => onUpdate('tempC', v)}   min={-5}  max={40}  unit=" °C"   compact />
      <Slider label="Humidity"    value={scenario.humPct}  onChange={v => onUpdate('humPct', v)}  min={0}   max={100} unit=" %"    compact />
      <Slider label="Wind speed"  value={scenario.windKmh} onChange={v => onUpdate('windKmh', v)} min={0}   max={80}  unit=" km/h" compact />
    </div>
  )
}

// ── Live clock ────────────────────────────────────────────────────────────────
const CLOCKS = [
  { label: 'Ljubljana', flag: '🇸🇮', tz: 'Europe/Ljubljana' },
  { label: 'Washington D.C.', flag: '🇺🇸', tz: 'America/New_York' },
]

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="clock-widget">
      {CLOCKS.map((c, i) => (
        <>
          {i > 0 && <div key={`div-${c.tz}`} className="clock-sep" />}
          <div key={c.tz} className="clock-city">
            <span className="clock-flag">{c.flag}</span>
            <div>
              <div className="clock-label">{c.label}</div>
              <div className="clock-time">
                {now.toLocaleTimeString('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="clock-date">
                {now.toLocaleDateString('en-GB', { timeZone: c.tz, weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </>
      ))}
    </div>
  )
}

// ── Deviation explainer ───────────────────────────────────────────────────────
function computeDrivers(hr, selectedDate, weathersit, tempC, humPct, windKmh, predResult, stats, regImp, corrMap) {
  const month   = selectedDate.getMonth() + 1
  const season  = monthToSeason(month)
  const weekday = (selectedDate.getDay() + 6) % 7  // 0=Mon … 6=Sun

  const featureVals = {
    hr:          hr,
    hr_sin:      Math.sin(2 * Math.PI * hr / 24),
    hr_cos:      Math.cos(2 * Math.PI * hr / 24),
    mnth:        month,
    mnth_sin:    Math.sin(2 * Math.PI * month / 12),
    mnth_cos:    Math.cos(2 * Math.PI * month / 12),
    temp:        tempC / 41,
    hum:         humPct / 100,
    windspeed:   windKmh / (1.609 * 67),
    weathersit:  weathersit,
    rush_hour:   predResult.is_rush   ? 1 : 0,
    peak_season: (season === 2 || season === 3) ? 1 : 0,
    bad_weather: weathersit === 3     ? 1 : 0,
    is_night:    (hr < 6 || hr > 22)  ? 1 : 0,
    is_weekend:  weekday >= 5         ? 1 : 0,
    rush_workday: (predResult.is_rush && predResult.is_workday) ? 1 : 0,
    comfort:     (tempC / 41) * (1 - humPct / 100) * (1 - windKmh / (1.609 * 67)),
  }

  const hrLabel = hr >= 7 && hr <= 9 ? 'morning rush' : hr >= 17 && hr <= 18 ? 'evening rush' : hr < 6 || hr > 22 ? 'night' : hr < 12 ? 'morning' : hr < 14 ? 'midday' : hr < 17 ? 'afternoon' : 'evening'
  const DRIVERS = [
    { key: 'hour',     icon: '🕐', label: `${String(hr).padStart(2,'0')}:00 — ${hrLabel}`, features: ['hr', 'hr_sin', 'hr_cos', 'rush_hour', 'is_night'] },
    { key: 'month',    icon: '📅', label: `${new Date(2000, month-1).toLocaleString('en-US',{month:'long'})} (${SEASON_NAMES[season]})`, features: ['mnth', 'mnth_sin', 'mnth_cos', 'peak_season'] },
    { key: 'temp',     icon: '🌡', label: `Temperature ${tempC}°C`,      features: ['temp'] },
    { key: 'humidity', icon: '💧', label: `Humidity ${humPct}%`,          features: ['hum'] },
    { key: 'wind',     icon: '🌬', label: `Wind ${windKmh} km/h`,         features: ['windspeed'] },
    { key: 'weather',  icon: WX_ICON[weathersit], label: WEATHER_NAMES[weathersit], features: ['weathersit', 'bad_weather'] },
  ]

  return DRIVERS.map(d => {
    const score = d.features.reduce((sum, f) => {
      const s   = stats[f]
      const imp = regImp[f] || 0
      if (!s || s.std < 0.0001) return sum
      const val      = featureVals[f] !== undefined ? featureVals[f] : 0
      // Multiply by sign of corr_cnt so "good" deviations always score positive
      const corrSign = (corrMap[f] ?? 0) < 0 ? -1 : 1
      return sum + ((val - s.mean) / s.std) * imp * corrSign
    }, 0)
    return { ...d, score }
  })
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 4)
}

const IMPACT_LABEL = score => {
  const abs = Math.abs(score)
  if (abs > 0.04) return 'strongest factor'
  if (abs > 0.02) return 'significant impact'
  if (abs > 0.008) return 'moderate impact'
  return 'minor impact'
}

function DeviationPanel({ hr, selectedDate, weathersit, tempC, humPct, windKmh, prediction, scienceData, baseline, stale }) {
  if (!prediction || !scienceData?.feature_stats) return null

  const regImp  = Object.fromEntries(
    (scienceData.reg_importance_ranked || []).map(r => [r.feature, r.importance])
  )
  const corrMap = Object.fromEntries(
    (scienceData.features || []).map(f => [f.name, f.corr_cnt])
  )
  const drivers = computeDrivers(hr, selectedDate, weathersit, tempC, humPct, windKmh, prediction, scienceData.feature_stats, regImp, corrMap)

  const weekday = selectedDate.getDay()
  const isWorkday = weekday >= 1 && weekday <= 5
  const baseRow = baseline?.find(b => b.hr === hr)
  const avgCnt = baseRow
    ? Math.round(isWorkday ? baseRow.workday : baseRow.weekend)
    : (scienceData.avg_cnt || 189)
  const avgLabel = baseRow
    ? `avg ${isWorkday ? 'working day' : 'weekend'} at ${String(hr).padStart(2, '0')}:00`
    : 'dataset average'

  const delta    = prediction.rental_count - avgCnt
  const deltaPct = Math.round(Math.abs(delta) / avgCnt * 100)

  return (
    <div className="card deviation-panel" style={{ opacity: stale ? 0.5 : 1, transition: 'opacity .2s' }}>
      <div className="dp-header">
        <span className="dp-bulb">💡</span>
        <div>
          <div className="dp-title">What's driving the deviation from an average hour?</div>
          <div className="dp-sub">
            Prediction: <b>{prediction.rental_count} bikes/hr</b> —{' '}
            <span style={{ color: delta >= 0 ? '#27ae60' : '#c0392b', fontWeight: 700 }}>
              {delta >= 0 ? '+' : ''}{Math.round(delta)} bikes
            </span>
            {' '}vs. {avgLabel} ({avgCnt} bikes/hr, {deltaPct}% {delta >= 0 ? 'above' : 'below'})
            {stale && <span style={{ color: '#aaa', marginLeft: 8 }}>— re-predict to refresh</span>}
          </div>
        </div>
      </div>

      <div className="dp-drivers">
        {drivers.map(d => (
          <div key={d.key} className="dp-driver-row">
            <span className={`dp-arrow ${d.score > 0.005 ? 'dp-up' : d.score < -0.005 ? 'dp-down' : 'dp-neutral'}`}>
              {d.score > 0.005 ? '↑' : d.score < -0.005 ? '↓' : '→'}
            </span>
            <span className="dp-icon">{d.icon}</span>
            <span className="dp-factor">{d.label}</span>
            <span className="dp-impact" style={{ color: d.score > 0.005 ? '#27ae60' : d.score < -0.005 ? '#c0392b' : '#aaa' }}>
              {IMPACT_LABEL(d.score)}
            </span>
          </div>
        ))}
      </div>
      <div className="dp-footnote">Ranked by XGBoost feature importance × deviation from dataset mean — approximate, not exact SHAP. Baseline = historical average for the same hour and day type.</div>
    </div>
  )
}

// ── Demand level helper ───────────────────────────────────────────────────────
const DEMAND_LEVELS = [
  { key: 'very-low',  arrow: '↓↓', label: 'Very Low',  desc: 'Quiet — <50 bikes/hr',      min: 0,   max: 50  },
  { key: 'low',       arrow: '↓',  label: 'Low',        desc: 'Relaxed — 51–150 bikes/hr', min: 51,  max: 150 },
  { key: 'medium',    arrow: '→',  label: 'Moderate',   desc: 'Average — 151–300 bikes/hr', min: 151, max: 300 },
  { key: 'high',      arrow: '↑',  label: 'High',       desc: 'Busy — 301–500 bikes/hr',   min: 301, max: 500 },
  { key: 'very-high', arrow: '↑↑', label: 'Very High',  desc: 'Peak — 501+ bikes/hr',      min: 501, max: Infinity },
]

function getDemandLevel(rentalCount) {
  return DEMAND_LEVELS.find(l => rentalCount >= l.min && rentalCount <= l.max) ?? DEMAND_LEVELS[0]
}

// ── Demand legend ─────────────────────────────────────────────────────────────
function DemandLegend() {
  return (
    <div className="demand-legend">
      <div className="demand-legend-title">Demand level guide</div>
      <div className="demand-legend-grid">
        {DEMAND_LEVELS.map(l => (
          <div key={l.key} className={`dl-item dl-${l.key}`}>
            <span className="dl-arrow">{l.arrow}</span>
            <span className="dl-label">{l.label}</span>
            <span className="dl-desc">{l.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Predictor() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [hr, setHr]                     = useState(currentHour)
  const [weathersit, setWeathersit]     = useState(1)
  const [tempC, setTempC]               = useState(20)
  const [humPct, setHumPct]             = useState(60)
  const [windKmh, setWindKmh]           = useState(15)

  const [comparisons, setComparisons] = useState([])

  function addComparison() {
    if (comparisons.length >= 2) return
    setComparisons(prev => [...prev, { id: Date.now(), selectedDate: new Date(selectedDate), hr, weathersit, tempC, humPct, windKmh }])
  }
  function removeComparison(id) { setComparisons(prev => prev.filter(c => c.id !== id)) }
  function updateComparison(id, field, value) {
    setComparisons(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const [scienceData, setScienceData] = useState(null)
  useEffect(() => {
    fetch('/science-data.json').then(r => r.json()).then(setScienceData).catch(() => {})
  }, [])

  const [baseline, setBaseline] = useState(null)
  useEffect(() => {
    fetch('/chart-data.json').then(r => r.json()).then(d => setBaseline(d.hourly)).catch(() => {})
  }, [])

  const [prediction, setPrediction]         = useState(null)
  const [predictionStale, setPredictionStale] = useState(false)
  const [loading, setLoading]               = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherStatus, setWeatherStatus]   = useState(null)
  const [error, setError]                   = useState(null)

  // Mark stale whenever inputs change after a prediction exists
  useEffect(() => {
    if (prediction) setPredictionStale(true)
  }, [selectedDate, hr, weathersit, tempC, humPct, windKmh])

  const dateStr = dateToStr(selectedDate)

  function applyWeatherData(info) {
    setTempC(info.tempC)
    setHumPct(info.humPct)
    setWindKmh(info.windKmh)
    setWeathersit(info.weathersit)
  }

  async function handleFetchWeather() {
    setWeatherLoading(true)
    setError(null)
    try {
      const w = await fetchDCWeather()
      setSelectedDate(strToDate(w.date))
      setHr(w.hr)
      setTempC(w.tempC)
      setHumPct(w.humPct)
      setWindKmh(w.windKmh)
      setWeathersit(w.weathersit)
      setWeatherStatus(`Live D.C. weather as of ${w.time} (Eastern Time)`)

      const [y, mo, d] = w.date.split('-').map(Number)
      const result = await predict({
        year: y, month: mo, day: d, hr: w.hr,
        weathersit: w.weathersit,
        temp_c: w.tempC, hum_pct: w.humPct, wind_kmh: w.windKmh,
      })
      setPrediction(result)
      setPredictionStale(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setWeatherLoading(false)
    }
  }

  async function handlePredict() {
    setLoading(true)
    setError(null)
    try {
      const result = await predict({
        year:  selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day:   selectedDate.getDate(),
        hr, weathersit,
        temp_c: tempC, hum_pct: humPct, wind_kmh: windKmh,
      })
      setPrediction(result)
      setPredictionStale(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const prob  = prediction ? Math.round(prediction.demand_prob * 100) : 0
  const level = prediction ? getDemandLevel(prediction.rental_count) : null

  return (
    <div>
      {/* Weather bar + clock */}
      <div className="weather-bar">
        <button className="btn btn-weather" onClick={handleFetchWeather} disabled={weatherLoading}>
          {weatherLoading ? '...' : '🌤'} Get real-time D.C. weather
        </button>
        <span className="weather-status">
          {weatherStatus ?? 'Fetches live conditions from Open-Meteo (no API key needed)'}
        </span>
        <LiveClock />
      </div>

      <DayForecastChart
        selectedDate={selectedDate}
        weathersit={weathersit}
        tempC={tempC}
        humPct={humPct}
        windKmh={windKmh}
        currentHr={hr}
        comparisons={comparisons}
        baseline={baseline}
      />

      <DeviationPanel
        hr={hr} selectedDate={selectedDate} weathersit={weathersit}
        tempC={tempC} humPct={humPct} windKmh={windKmh}
        prediction={prediction} scienceData={scienceData}
        baseline={baseline}
        stale={predictionStale}
      />

      {/* Comparison scenario cards */}
      <div className="scenario-row">
          {/* Scenario A — read-only summary card, only when comparisons exist */}
          {comparisons.length > 0 && <div className="scenario-card" style={{ borderTopColor: SCENARIO_COLORS[0] }}>
            <div className="scenario-card-head">
              <span className="scenario-dot" style={{ background: SCENARIO_COLORS[0] }} />
              <span className="scenario-card-label">{SCENARIO_LABELS[0]}</span>
            </div>
            <div className="sc-summary-row"><span className="sc-summary-label">Date</span><span>{dateToStr(selectedDate)}</span></div>
            <div className="sc-summary-row"><span className="sc-summary-label">Hour</span><span>{String(hr).padStart(2,'0')}:00</span></div>
            <div style={{ borderTop: '1px solid #eee', margin: '6px 0' }} />
            <div className="sc-summary-row"><span className="sc-summary-label">Weather</span><span>{WX_ICON[weathersit]} {WEATHER_NAMES[weathersit]}</span></div>
            <div className="sc-summary-row"><span className="sc-summary-label">Temp</span><span>{tempC} °C</span></div>
            <div className="sc-summary-row"><span className="sc-summary-label">Humidity</span><span>{humPct} %</span></div>
            <div className="sc-summary-row"><span className="sc-summary-label">Wind</span><span>{windKmh} km/h</span></div>
            <p style={{ fontSize: '0.7rem', color: '#aaa', margin: '8px 0 0', lineHeight: 1.4 }}>Edit in the input panel ↓</p>
          </div>}

          {comparisons.map((c, i) => (
            <ScenarioCard
              key={c.id}
              scenario={c}
              index={i}
              onUpdate={(field, val) => updateComparison(c.id, field, val)}
              onRemove={() => removeComparison(c.id)}
            />
          ))}

          {comparisons.length < 2 && (
            <button className="btn-add-scenario" onClick={addComparison}>
              + Add comparison
            </button>
          )}
      </div>

      <div className="predictor-grid">
        {/* ── Left: inputs ── */}
        <div className="card">
          <div className="card-title">Input parameters</div>

          {/* Date picker */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <DatePicker
              selected={selectedDate}
              onChange={d => d && setSelectedDate(d)}
              dateFormat="yyyy-MM-dd"
              dayClassName={getDayClass}
              wrapperClassName="dp-wrapper"
              className="dp-input"
              todayButton="Today"
            />
            <div className="cal-legend">
              <span className="cl-dot cl-past"></span> Historical &nbsp;
              <span className="cl-dot cl-forecast"></span> Forecast (≤ 16 days) &nbsp;
              <span className="cl-dot cl-no-data"></span> No data yet
            </div>
          </div>

          <Slider label="Hour of day" value={hr} onChange={setHr} min={0} max={23} unit=":00" />

          {/* Weather info panel — auto-fetches for selected date + hour */}
          <WeatherInfoPanel dateStr={dateStr} hr={hr} onApply={applyWeatherData} />

          <div className="override-label">Manual override</div>

          <div className="form-group">
            <label className="form-label">Weather condition</label>
            <select value={weathersit} onChange={e => setWeathersit(Number(e.target.value))}>
              <option value={1}>☀️  Clear / few clouds</option>
              <option value={2}>🌥️  Mist / Cloudy</option>
              <option value={3}>🌧️  Light Rain or Snow</option>
            </select>
          </div>

          <Slider label="Temperature" value={tempC}   onChange={setTempC}   min={-5}  max={40}  unit=" °C"   />
          <Slider label="Humidity"    value={humPct}  onChange={setHumPct}  min={0}   max={100} unit=" %"    />
          <Slider label="Wind speed"  value={windKmh} onChange={setWindKmh} min={0}   max={80}  unit=" km/h" />

          {prediction && (
            <div className={predictionStale ? 'pred-status pred-status-stale' : 'pred-status pred-status-ok'}>
              <span className="pred-status-dot" />
              {predictionStale
                ? 'Parameters changed — click Predict to update'
                : 'Prediction matches current inputs'}
            </div>
          )}

          <div className="btn-predict-wrap">
            <button className="btn btn-primary" onClick={handlePredict} disabled={loading}>
              {loading ? 'Predicting...' : 'Predict demand'}
            </button>
          </div>

          {error && (
            <div className="error-box">
              {error.includes('fetch') || error.includes('Failed')
                ? 'Cannot reach the API — make sure FastAPI is running on port 8000.'
                : error}
            </div>
          )}
        </div>

        {/* ── Right: result ── */}
        <div>
          {prediction ? (
            <>
              <div className={`result-level result-${level.key}`}>
                <div className="result-label">{level.arrow} {level.label.toUpperCase()} DEMAND</div>
                <div className="result-sub">Confidence: {prob}% probability of high demand</div>
              </div>

              <div className="card">
                <div className="card-title">Estimated rentals</div>
                <div className="rental-count">
                  <span className="count">{prediction.rental_count}</span>
                  <span className="unit">bikes / hour  <span style={{color:'#aaa'}}>± 23 MAE</span></span>
                </div>
                <hr className="div" />
                <div className="card-title">Prediction context</div>
                <ContextTable
                  selectedDate={selectedDate}
                  hr={hr} weathersit={weathersit}
                  tempC={tempC} humPct={humPct} windKmh={windKmh}
                  result={prediction}
                />
              </div>

              <div className="alert-info">
                Model trained on 2011–2012 Washington D.C. data. Any date after 2012 is treated as 2012
                for the year feature. Predictions reflect historical patterns, not current fleet size.
              </div>
              <DemandLegend />
            </>
          ) : (
            <div className="card placeholder">
              <div className="placeholder-icon">&#x1F4CA;</div>
              <p>Set your inputs and click <strong>Predict demand</strong>,<br />
                 or use the weather button to auto-fill current D.C. conditions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
