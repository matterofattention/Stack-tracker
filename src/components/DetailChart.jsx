import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { fetchQuote, TICKER_NAMES, RANGES } from '../services/yahooFinance'
import './DetailChart.css'

function formatDate(dateStr, range) {
  const d = new Date(dateStr)
  if (range === '1W' || range === '1M' || range === '3M') {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export default function DetailChart({ symbol, onClose }) {
  const [range, setRange] = useState('5Y')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchQuote(symbol, range)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol, range])

  const change = data
    ? ((data.currentPrice - data.prices[0]?.price) / data.prices[0]?.price) * 100
    : null
  const positive = change == null || change >= 0
  const color = positive ? '#22c55e' : '#ef4444'

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>

        <div className="detail-header">
          <div>
            <h2>{symbol}</h2>
            <div className="detail-name">{TICKER_NAMES[symbol]}</div>
          </div>
          {data && (
            <div className="detail-price-block">
              <div className="detail-price">
                {data.currency} {data.currentPrice.toFixed(2)}
              </div>
              <div className={`detail-change ${positive ? 'up' : 'down'}`}>
                {positive ? '+' : ''}{change.toFixed(2)}% ({range})
              </div>
            </div>
          )}
        </div>

        <div className="range-selector">
          {RANGES.map(r => (
            <button
              key={r}
              className={range === r ? 'active' : ''}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="chart-area">
          {loading && <div className="chart-status">Loading…</div>}
          {error && <div className="chart-status error">{error}</div>}
          {!loading && !error && data && (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data.prices}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4e" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => formatDate(d, range)}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={v => v.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{ background: '#0f0f23', border: '1px solid #2d2d4e', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                  itemStyle={{ color: '#f1f5f9' }}
                  formatter={v => [`${data.currency} ${v.toFixed(2)}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
