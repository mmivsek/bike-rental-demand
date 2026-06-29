import { useState } from 'react'
import { predict } from '../lib/api.js'
import { fetchDCWeather } from '../lib/weather.js'
import { SEASON_NAMES, WEATHER_NAMES, WEEKDAY_NAMES } from '../lib/constants.js'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}
function currentHour() {
  return new Date().getHours()
}

function Slider({ label, value, onChange, min, max, unit, step = 1 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
        <span className="slider-val">{value}{unit}</span>
      </div>
    </div>
  )
}

function monthToSeason(month) {
  const map = { 3:1, 4:1, 5:1, 6:2, 7:2, 8:2, 9:3, 10:3, 11:3, 12:4, 1:4, 2:4 }
  return map[month]
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = WEEKDAY_NAMES[(d.getDay() + 6) % 7]
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ` (${day})`
}

function ContextTable({ inputs, result }) {
  const [y, m, d] = inputs.date.split('-').map(Number)
  const season = monthToSeason(m)
  const weekday = result.weekday ?? (new Date(inputs.date + 'T12:00:00').getDay() + 6) % 7

  return (
    <table className="ctx-table">
      <tbody>
        <tr><td>Date</td><td>{formatDateDisplay(inputs.date)}</td></tr>
        <tr><td>Hour</td><td>{String(inputs.hr).padStart(2, '0')}:00{result.is_rush ? ' — Rush hour' : ''}{result.is_workday === false ? ' — Off day' : ''}</td></tr>
        <tr><td>Day type</td><td>{result.is_workday ? 'Working day' : 'Weekend / Holiday'}</td></tr>
        <tr><td>Season</td><td>{SEASON_NAMES[season]}</td></tr>
        <tr><td>Weather</td><td>{WEATHER_NAMES[inputs.weathersit]}</td></tr>
        <tr><td>Temperature</td><td>{inputs.tempC} °C</td></tr>
        <tr><td>Humidity</td><td>{inputs.humPct} %</td></tr>
        <tr><td>Wind</td><td>{inputs.windKmh} km/h</td></tr>
      </tbody>
    </table>
  )
}

export default function Predictor() {
  const [date, setDate]           = useState(todayStr)
  const [hr, setHr]               = useState(currentHour)
  const [weathersit, setWeathersit] = useState(1)
  const [tempC, setTempC]         = useState(20)
  const [humPct, setHumPct]       = useState(60)
  const [windKmh, setWindKmh]     = useState(15)

  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherStatus, setWeatherStatus]   = useState(null)
  const [error, setError]           = useState(null)

  const currentInputs = { date, hr, weathersit, tempC, humPct, windKmh }

  async function handleFetchWeather() {
    setWeatherLoading(true)
    setError(null)
    try {
      const w = await fetchDCWeather()
      // Set state for the form
      setDate(w.date)
      setHr(w.hr)
      setTempC(w.tempC)
      setHumPct(w.humPct)
      setWindKmh(w.windKmh)
      setWeathersit(w.weathersit)
      setWeatherStatus(`Live D.C. weather as of ${w.time} (Eastern Time)`)

      // Predict immediately with the fetched values
      const [y, mo, d] = w.date.split('-').map(Number)
      const result = await predict({
        year: y, month: mo, day: d, hr: w.hr,
        weathersit: w.weathersit,
        temp_c: w.tempC, hum_pct: w.humPct, wind_kmh: w.windKmh,
      })
      setPrediction(result)
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
      const [y, mo, d] = date.split('-').map(Number)
      const result = await predict({
        year: y, month: mo, day: d, hr,
        weathersit, temp_c: tempC, hum_pct: humPct, wind_kmh: windKmh,
      })
      setPrediction(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isHigh = prediction?.demand_class === 1
  const prob = prediction ? Math.round(prediction.demand_prob * 100) : 0

  return (
    <div>
      {/* Weather button bar */}
      <div className="weather-bar">
        <button
          className="btn btn-weather"
          onClick={handleFetchWeather}
          disabled={weatherLoading}
        >
          {weatherLoading ? '...' : '🌤'} Get real-time D.C. weather
        </button>
        {weatherStatus && (
          <span className="weather-status">{weatherStatus}</span>
        )}
        {!weatherStatus && (
          <span className="weather-status">Fetches live conditions from Open-Meteo (no API key needed)</span>
        )}
      </div>

      <div className="predictor-grid">
        {/* ── Left: inputs ── */}
        <div className="card">
          <div className="card-title">Input parameters</div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <Slider label="Hour of day" value={hr} onChange={setHr} min={0} max={23} unit=":00" />

          <div className="form-group">
            <label className="form-label">Weather condition</label>
            <select value={weathersit} onChange={e => setWeathersit(Number(e.target.value))}>
              <option value={1}>☀️  Clear / few clouds</option>
              <option value={2}>🌥️  Mist / Cloudy</option>
              <option value={3}>🌧️  Light Rain or Snow</option>
            </select>
          </div>

          <Slider label="Temperature" value={tempC} onChange={setTempC} min={-5} max={40} unit=" °C" />
          <Slider label="Humidity" value={humPct} onChange={setHumPct} min={0} max={100} unit=" %" />
          <Slider label="Wind speed" value={windKmh} onChange={setWindKmh} min={0} max={80} unit=" km/h" />

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
              <div className={isHigh ? 'result-high' : 'result-low'}>
                <div className="result-label">
                  {isHigh ? '↑ HIGH demand' : '↓ LOW demand'}
                </div>
                <div className="result-sub">
                  Confidence: {prob}% probability of high demand
                </div>
                <div className="prob-bar-wrap">
                  <div className="prob-bar-track">
                    <div className="prob-bar-fill" style={{ width: `${prob}%` }} />
                  </div>
                  <div className="prob-label">High-demand probability</div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Estimated rentals</div>
                <div className="rental-count">
                  <span className="count">{prediction.rental_count}</span>
                  <span className="unit">bikes / hour  <span style={{color:'#aaa'}}>± 23 MAE</span></span>
                </div>

                <hr className="div" />
                <div className="card-title">Prediction context</div>
                <ContextTable inputs={currentInputs} result={prediction} />
              </div>

              <div className="alert-info">
                Model trained on 2011–2012 Washington D.C. data. Any date after 2012 is treated as 2012
                for the year feature. Predictions reflect historical patterns, not current fleet size.
              </div>
            </>
          ) : (
            <div className="card placeholder">
              <div className="placeholder-icon">&#x1F4CA;</div>
              <p>Set your inputs and click <strong>Predict demand</strong>,<br />or use the weather button to auto-fill current D.C. conditions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
