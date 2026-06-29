// WMO weather codes → UCI weathersit (1=clear, 2=mist/cloudy, 3=rain/snow)
function wmoToWeathersit(code) {
  if ([0, 1, 2].includes(code)) return 1
  if ([3, 45, 48, 51, 53, 61, 80, 81, 82].includes(code)) return 2
  return 3
}

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=38.9072&longitude=-77.0369' +
  '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
  '&wind_speed_unit=kmh&timezone=America%2FNew_York'

export async function fetchDCWeather() {
  const res = await fetch(OPEN_METEO_URL)
  if (!res.ok) throw new Error('Open-Meteo request failed')
  const data = await res.json()
  const cur = data.current

  // cur.time = "2026-06-29T05:30" (Eastern Time)
  const [datePart, timePart] = cur.time.split('T')
  const [, , ] = datePart.split('-').map(Number)
  const hrStr = timePart.split(':')[0]

  return {
    date: datePart,
    hr: parseInt(hrStr, 10),
    tempC: Math.round(cur.temperature_2m),
    humPct: Math.round(cur.relative_humidity_2m),
    windKmh: Math.round(cur.wind_speed_10m),
    weathersit: wmoToWeathersit(cur.weather_code),
    time: cur.time,
  }
}
