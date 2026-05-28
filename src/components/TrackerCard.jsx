import SparkLine from './SparkLine'
import { TICKER_NAMES } from '../services/yahooFinance'
import './TrackerCard.css'

export default function TrackerCard({ symbol, data, error, loading, onClick }) {
  const change = data
    ? ((data.currentPrice - data.previousClose) / data.previousClose) * 100
    : null
  const positive = change >= 0

  return (
    <div className="tracker-card" onClick={onClick}>
      <div className="card-header">
        <span className="card-symbol">{symbol}</span>
        {data && (
          <span className={`card-change ${positive ? 'up' : 'down'}`}>
            {positive ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="card-name">{TICKER_NAMES[symbol]}</div>

      {loading && <div className="card-status">Loading…</div>}
      {error && <div className="card-status error">{error}</div>}

      {data && (
        <>
          <div className="card-price">
            {data.currency} {data.currentPrice.toFixed(2)}
          </div>
          <SparkLine prices={data.prices} positive={positive} />
        </>
      )}
    </div>
  )
}
