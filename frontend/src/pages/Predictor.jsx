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
function Slider({ label, value, onChange, min, max, unit, step = 1 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="slider-row">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} />
        <span className="slider-val">{value}{unit}</span>
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
          <button className="btn-apply" onClick={() => onApply(info)}>
            ↓ Apply to predictor
          </button>
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

// ── Day forecast chart ────────────────────────────────────────────────────────
function DayForecastChart({ selectedDate, weathersit, tempC, humPct, windKmh, currentHr }) {
  const [dayData, setDayData]   = useState(null)
  const [baseline, setBaseline] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState(null)
  const timerRef                = useRef(null)

  // Load baseline once
  useEffect(() => {
    fetch('/chart-data.json')
      .then(r => r.json())
      .then(d => setBaseline(d.hourly))
      .catch(() => {})
  }, [])

  // Debounced day forecast fetch
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setErr(null)
      try {
        const result = await predictDay({
          year:  selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day:   selectedDate.getDate(),
          hr: 12,               // hr is irrelevant for day forecast; API ignores per-hour override
          weathersit,
          temp_c: tempC, hum_pct: humPct, wind_kmh: windKmh,
        })
        setDayData(result)
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timerRef.current)
  }, [selectedDate, weathersit, tempC, humPct, windKmh])

  // Merge day forecast with baseline
  const chartData = baseline?.map(b => {
    const row = { hr: b.hr, avg: dayData?.is_workday ? b.workday : b.weekend }
    if (dayData) {
      const h = dayData.hours.find(x => x.hr === b.hr)
      if (h) row.forecast = h.rental_count
    }
    return row
  })

  const isWorkday = dayData ? dayData.is_workday : selectedDate.getDay() !== 0 && selectedDate.getDay() !== 6
  const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="card day-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Hourly demand forecast — {dateLabel}
        </div>
        {loading && <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Fetching…</span>}
      </div>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 12, marginTop: 2 }}>
        Red = model prediction with selected weather · Gray dashed = historical average for a {isWorkday ? 'working day' : 'weekend day'}
      </p>

      {err && (
        <div className="error-box" style={{ marginBottom: 8 }}>
          {err.includes('fetch') || err.includes('Failed')
            ? 'Start the FastAPI server on port 8000 to see predictions.'
            : err}
        </div>
      )}

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="hr"
              tickFormatter={v => `${v}:00`}
              interval={2}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} unit=" bikes" width={68} />
            <Tooltip content={<DayChartTooltip />} />
            <Legend />
            {/* vertical line at current selected hour */}
            <ReferenceLine
              x={currentHr}
              stroke="#c0392b"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: `${currentHr}:00`, position: 'top', style: { fontSize: 10, fill: '#c0392b' } }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name={isWorkday ? 'Avg working day' : 'Avg weekend'}
              stroke="#aaa"
              strokeDasharray="5 3"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            {dayData && (
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast (these conditions)"
                stroke="#c0392b"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
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
      />

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
