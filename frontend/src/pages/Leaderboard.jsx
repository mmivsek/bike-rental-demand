import { CLF_LEADERBOARD, REG_LEADERBOARD } from '../lib/constants.js'

function fmt(v, decimals = 3) {
  if (v === '—') return '—'
  return typeof v === 'number' ? v.toFixed(decimals) : v
}

function ClfTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Accuracy</th>
            <th>Precision</th>
            <th>Recall</th>
            <th>F1</th>
            <th>ROC-AUC</th>
          </tr>
        </thead>
        <tbody>
          {CLF_LEADERBOARD.map(r => (
            <tr key={r.model} className={r.best ? 'best' : ''}>
              <td>
                {r.best ? <span className="badge badge-xgb">XGBoost</span> : null}
                {r.best ? ' ' : ''}{r.model}
              </td>
              <td>{fmt(r.acc)}</td>
              <td>{fmt(r.prec)}</td>
              <td>{fmt(r.rec)}</td>
              <td>{fmt(r.f1)}</td>
              <td>{fmt(r.auc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RegTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>R²</th>
            <th>MAE (bikes/hr)</th>
            <th>RMSE (bikes/hr)</th>
          </tr>
        </thead>
        <tbody>
          {REG_LEADERBOARD.map(r => (
            <tr key={r.model} className={r.best ? 'best' : ''}>
              <td>
                {r.best ? <span className="badge badge-xgb">XGBoost</span> : null}
                {r.best ? ' ' : ''}{r.model}
              </td>
              <td>{fmt(r.r2)}</td>
              <td>{fmt(r.mae, 1)}</td>
              <td>{fmt(r.rmse, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Leaderboard() {
  return (
    <div>
      <div className="card">
        <div className="section-title">Classification — Is demand HIGH or LOW?</div>
        <p style={{ fontSize: '0.88rem', color: '#6c757d', marginBottom: 16 }}>
          Target: <code>demand_high</code> (1 if hourly rentals &gt; 142, else 0). Test set = 15 % of 17,379 hours.
        </p>
        <ClfTable />
        <p style={{ fontSize: '0.82rem', color: '#888', marginTop: 12 }}>
          XGBoost achieves 95.1 % accuracy and 0.989 ROC-AUC — near-perfect separation of high-demand hours.
          The large gap over Logistic Regression shows that non-linear interactions (rush hour × workday, temp × comfort) drive most of the signal.
        </p>
      </div>

      <div className="card">
        <div className="section-title">Regression — How many bikes per hour?</div>
        <p style={{ fontSize: '0.88rem', color: '#6c757d', marginBottom: 16 }}>
          Target: <code>cnt</code> (hourly rental count, range 1–977). Test set = 15 % of 17,379 hours.
        </p>
        <RegTable />
        <p style={{ fontSize: '0.82rem', color: '#888', marginTop: 12 }}>
          XGBoost explains 95.5 % of variance with a mean absolute error of only 22.8 bikes/hour.
          Ridge Regression (R² = 0.73) is a strong baseline but misses peak-hour spikes; tree ensembles handle them naturally.
        </p>
      </div>
    </div>
  )
}
