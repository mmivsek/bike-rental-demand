// WMO weather codes → UCI weathersit (1=clear, 2=mist/cloudy, 3=rain/snow)
function wmoToWeathersit(code) {
  if ([0, 1, 2].includes(code)) return 1
  if ([3, 45, 48, 51, 53, 61, 80, 81, 82].includes(code)) return 2
  return 3
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return localDateStr(dt)
}

// ── Date type classifier ─────────────────────────────────────────────────────
// Returns 'historical' | 'current' | 'forecast' | 'no-data'
export function getDateType(dateStr) {
  const today = localDateStr()
  const forecastEnd = addDays(today, 16)
  if (dateStr < today)        return 'historical'
  if (dateStr === today)      return 'current'
  if (dateStr <= forecastEnd) return 'forecast'
  return 'no-data'
}

// ── Fetch current D.C. weather (existing feature) ────────────────────────────
const CURRENT_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=38.9072&longitude=-77.0369' +
  '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
  '&wind_speed_unit=kmh&timezone=America%2FNew_York'

export async function fetchDCWeather() {
  const res = await fetch(CURRENT_URL)
  if (!res.ok) throw new Error('Open-Meteo request failed')
  const data = await res.json()
  const cur = data.current
  const [datePart, timePart] = cur.time.split('T')
  return {
    date:       datePart,
    hr:         parseInt(timePart.split(':')[0], 10),
    tempC:      Math.round(cur.temperature_2m),
    humPct:     Math.round(cur.relative_humidity_2m),
    windKmh:    Math.round(cur.wind_speed_10m),
    weathersit: wmoToWeathersit(cur.weather_code),
    time:       cur.time,
  }
}

// ── Fetch weather for a specific date + hour ─────────────────────────────────
// Uses forecast API (covers past 14 days + next 16 days).
// Falls back to archive API for dates older than 14 days.

const HOURLY_FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=38.9072&longitude=-77.0369' +
  '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
  '&wind_speed_unit=kmh&timezone=America%2FNew_York' +
  '&past_days=14&forecast_days=16'

function archiveUrl(dateStr) {
  return (
    'https://archive-api.open-meteo.com/v1/archive' +
    '?latitude=38.9072&longitude=-77.0369' +
    `&start_date=${dateStr}&end_date=${dateStr}` +
    '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&wind_speed_unit=kmh&timezone=America%2FNew_York'
  )
}

export async function fetchWeatherForDateTime(dateStr, hr) {
  const dateType = getDateType(dateStr)
  if (dateType === 'no-data') throw new Error('Date is beyond the 16-day forecast window.')

  const today       = localDateStr()
  const archiveCutoff = addDays(today, -14)
  const targetTime  = `${dateStr}T${String(hr).padStart(2, '0')}:00`

  let data
  if (dateStr < archiveCutoff) {
    const res = await fetch(archiveUrl(dateStr))
    if (!res.ok) throw new Error('Historical archive request failed')
    data = await res.json()
  } else {
    const res = await fetch(HOURLY_FORECAST_URL)
    if (!res.ok) throw new Error('Forecast API request failed')
    data = await res.json()
  }

  const idx = data.hourly.time.indexOf(targetTime)
  if (idx === -1) throw new Error(`No data found for ${dateStr} at ${hr}:00`)

  return {
    tempC:       Math.round(data.hourly.temperature_2m[idx]),
    humPct:      Math.round(data.hourly.relative_humidity_2m[idx]),
    windKmh:     Math.round(data.hourly.wind_speed_10m[idx]),
    weathersit:  wmoToWeathersit(data.hourly.weather_code[idx]),
    weatherCode: data.hourly.weather_code[idx],
    dateType,
  }
}
