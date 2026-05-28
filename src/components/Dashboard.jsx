import { useState, useEffect } from 'react'
import TrackerCard from './TrackerCard'
import DetailChart from './DetailChart'
import { fetchQuote, TICKERS } from '../services/yahooFinance'
import './Dashboard.css'

export default function Dashboard() {
  const [quotes, setQuotes] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState({})
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(Object.fromEntries(TICKERS.map(t => [t, true])))

    TICKERS.forEach(symbol => {
      fetchQuote(symbol, '1M')
        .then(data => {
          setQuotes(q => ({ ...q, [symbol]: data }))
          setLoading(l => ({ ...l, [symbol]: false }))
        })
        .catch(e => {
          setErrors(err => ({ ...err, [symbol]: e.message }))
          setLoading(l => ({ ...l, [symbol]: false }))
        })
    })
  }, [])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Stack Tracker</h1>
        <span className="dashboard-subtitle">Precious metals &amp; financials</span>
      </header>

      <div className="tracker-grid">
        {TICKERS.map(symbol => (
          <TrackerCard
            key={symbol}
            symbol={symbol}
            data={quotes[symbol]}
            error={errors[symbol]}
            loading={loading[symbol]}
            onClick={() => setSelected(symbol)}
          />
        ))}
      </div>

      {selected && (
        <DetailChart symbol={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
