import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { STATIONS } from '../lib/constants.js'

const METRICS = [
  { label: 'Dataset rows', value: '17,379', sub: 'hourly records 2011–2012' },
  { label: 'Features', value: '23', sub: 'after engineering & selection' },
  { label: 'Training split', value: '85 %', sub: '14,772 hours' },
  { label: 'Test split', value: '15 %', sub: '2,607 hours' },
  { label: 'Demand threshold', value: '142', sub: 'bikes/hr (median)' },
]

const DATASET_TABLE = [
  { col: 'dteday', desc: 'Date (YYYY-MM-DD)' },
  { col: 'hr', desc: 'Hour of day (0–23)' },
  { col: 'season', desc: '1=Spring, 2=Summer, 3=Fall, 4=Winter' },
  { col: 'weathersit', desc: '1=Clear, 2=Mist, 3=Light rain, 4=Heavy rain' },
  { col: 'temp', desc: 'Normalised temperature (÷ 41 °C)' },
  { col: 'hum', desc: 'Normalised humidity (÷ 100 %)' },
  { col: 'windspeed', desc: 'Normalised wind (÷ 67 mph)' },
  { col: 'casual', desc: 'Non-registered user rides' },
  { col: 'registered', desc: 'Registered user rides' },
  { col: 'cnt', desc: 'Total rides = casual + registered' },
]

export default function About() {
  return (
    <div>
      {/* Metric cards */}
      <div className="grid-5" style={{ marginBottom: 22 }}>
        {METRICS.map(m => (
          <div className="metric-card" key={m.label}>
            <div className="m-label">{m.label}</div>
            <div className="m-value">{m.value}</div>
            <div className="m-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Context */}
      <div className="card">
        <div className="section-title">Background</div>
        <div className="grid-2" style={{ gap: 28, alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#444' }}>
              Capital Bikeshare launched in Washington D.C. in September 2010 as one of the first large-scale
              bike-share systems in the United States. By 2012 the system had grown to over{' '}
              <strong>140 stations</strong> and <strong>1,100 bikes</strong>, serving commuters, tourists,
              and leisure riders across the District and Arlington, VA.
            </p>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#444', marginTop: 12 }}>
              The UCI Bike Sharing Dataset captures every hour of operation in 2011 and 2012,
              recording environmental conditions (temperature, humidity, wind, weather code) alongside
              the actual rental counts. This makes it ideal for studying how time-of-day, weather,
              and seasonal effects interact to drive demand.
            </p>
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2011</strong>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4 }}>~100</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>stations</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 8 }}>~800</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>bikes</div>
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2012</strong>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4 }}>~140</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>stations</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 8 }}>~1,100</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>bikes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="card">
        <div className="section-title">Capital Bikeshare in photos</div>
        <div className="photo-grid">
          <div>
            <img src="/assets/bike.jpg" alt="Capital Bikeshare bike" />
            <div className="photo-cap">Capital Bikeshare bicycle — distinctive red design, 3-speed, basket included.</div>
          </div>
          <div>
            <img src="/assets/station.jpg" alt="Docking station at Eastern Market Metro" />
            <div className="photo-cap">Docking station at Eastern Market Metro station, D.C.</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <img src="/assets/monument_station.jpg" alt="Station near Washington Monument" style={{ width: '100%', borderRadius: 8, maxHeight: 260, objectFit: 'cover' }} />
          <div className="photo-cap" style={{ marginTop: 6 }}>Station near the Washington Monument — one of the highest-demand locations in the dataset.</div>
        </div>
      </div>

      {/* Dataset columns */}
      <div className="card">
        <div className="section-title">Dataset columns (hour.csv)</div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 14 }}>
          Source: UCI Machine Learning Repository — Bike Sharing Dataset (Fanaee-T & Gama, 2013).
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {DATASET_TABLE.map(r => (
                <tr key={r.col}>
                  <td><code style={{ background: '#f8f9fa', padding: '2px 6px', borderRadius: 4, fontSize: '0.85rem' }}>{r.col}</code></td>
                  <td style={{ fontSize: '0.88rem' }}>{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map */}
      <div className="card">
        <div className="section-title">Station map — Washington D.C. area</div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 14 }}>
          Approximate locations of ~90 Capital Bikeshare stations active in 2011–2012.
        </p>
        <div className="map-container">
          <MapContainer
            center={[38.9072, -77.0369]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {STATIONS.map(([lat, lon], i) => (
              <CircleMarker
                key={i}
                center={[lat, lon]}
                radius={7}
                pathOptions={{ fillColor: '#c0392b', color: '#8e1a11', weight: 1, fillOpacity: 0.75 }}
              >
                <Tooltip>Station {i + 1}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
