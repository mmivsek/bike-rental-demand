import { useState, useMemo } from 'react'
import Predictor from './pages/Predictor.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Charts from './pages/Charts.jsx'
import Science from './pages/Science.jsx'
import About from './pages/About.jsx'
import Architecture from './pages/Architecture.jsx'

const DC_IMAGES = ['/images/w_dc_neutral.jpg', '/images/w_dc_rain.jpg']

const TABS = [
  { id: 'predictor',    label: 'Predictor' },
  { id: 'leaderboard',  label: 'Leaderboard' },
  { id: 'charts',       label: 'Demand Patterns' },
  { id: 'science',      label: 'ML & Science' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'about',        label: 'About the Data' },
]

export default function App() {
  const [tab, setTab] = useState('predictor')
  const headerImg = useMemo(() => DC_IMAGES[Math.floor(Math.random() * DC_IMAGES.length)], [])

  return (
    <div>
      <header className="header" style={{ backgroundImage: `url(${headerImg})` }}>
        <div className="header-overlay" />
        <div className="header-content">
          <span className="header-icon">&#x1F6B2;</span>
          <h1>Washington D.C. — Bike Rental Demand</h1>
        </div>
        <span className="header-sub">Capital Bikeshare · 2011–2012 · XGBoost</span>
      </header>

      <nav className="nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'predictor'    && <Predictor />}
        {tab === 'leaderboard'  && <Leaderboard />}
        {tab === 'charts'       && <Charts />}
        {tab === 'science'      && <Science />}
        {tab === 'architecture' && <Architecture />}
        {tab === 'about'        && <About />}
      </main>
    </div>
  )
}
