import { useState, useEffect } from 'react'
import TrackerCard from './TrackerCard'
import DetailChart from './DetailChart'
import PriceTable from './PriceTable'
import ScrapPricesTab from './ScrapPricesTab'
import { fetchQuote, TICKERS, computeGSR } from '../services/yahooFinance'
import './Dashboard.css'

export default function Dashboard() {
  const [tab, setTab] = useState('markets')
  const [quotes, setQuotes] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState({})
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(Object.fromEntries(TICKERS.map(t => [t, true])))

    const fetchable = TICKERS.filter(t => t !== 'GSR')

    fetchable.forEach(symbol => {
      fetchQuote(symbol, '1M')
        .then(data => {
          setQuotes(q => {
            const next = { ...q, [symbol]: data }
            if (next['GC=F'] && next['SI=F']) {
              next['GSR'] = computeGSR(next['GC=F'], next['SI=F'])
              setLoading(l => ({ ...l, GSR: false }))
            }
            return next
          })
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
        <div className="dashboard-tabs">
          <button
            className={tab === 'markets' ? 'active' : ''}
            onClick={() => setTab('markets')}
          >
            Markets
          </button>
          <button
            className={tab === 'prices' ? 'active' : ''}
            onClick={() => setTab('prices')}
          >
            Shop Prices
          </button>
          <button
            className={tab === 'scrap' ? 'active' : ''}
            onClick={() => setTab('scrap')}
          >
            Scrap Prices
          </button>
        </div>
      </header>

      {tab === 'markets' && (
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
      )}

      {tab === 'prices' && <PriceTable />}

      {tab === 'scrap' && <ScrapPricesTab />}

      {selected && (
        <DetailChart symbol={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
