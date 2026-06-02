import { useState, useEffect } from 'react'
import './ScrapPricesTab.css'

const GOLD_ORDER = ['999', '750', '585', '375', '333']
const SILVER_ORDER = ['999', '925', '835', '800']

const PURITY_LABELS = {
  gold: {
    '999': '24k · 999/1000',
    '750': '18k · 750/1000',
    '585': '14k · 585/1000',
    '375': '9k · 375/1000',
    '333': '8k · 333/1000',
  },
  silver: {
    '999': '999/1000',
    '925': '925/1000',
    '835': '835/1000',
    '800': '800/1000',
  },
}

function formatPrice(price) {
  if (price == null) return '—'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function buildRows(sources, metal, orderKeys) {
  // Collect all purity keys that appear in any source
  const seen = new Set()
  for (const src of sources) {
    for (const entry of (src[metal] ?? [])) seen.add(entry.key)
  }
  // Maintain canonical order
  const keys = orderKeys.filter(k => seen.has(k))

  return keys.map(key => {
    const label = PURITY_LABELS[metal][key] ?? key
    const prices = sources.map(src => {
      const entry = (src[metal] ?? []).find(e => e.key === key)
      return { sourceId: src.id, sourceName: src.name, sourceUrl: src.url, price: entry?.pricePerGram ?? null }
    })
    return { key, label, prices }
  })
}

export default function ScrapPricesTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/matterofattention/Stack-tracker/main/public/scrap-prices.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not load scrap prices'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="sp-status">Loading scrap prices…</div>
  if (error)   return <div className="sp-status sp-error">{error}</div>

  const sources = data?.sources ?? []
  const hasData = sources.some(s => s.gold?.length > 0 || s.silver?.length > 0)

  if (!hasData) {
    return (
      <div className="sp-status">
        No scrap price data yet — first scrape pending.
      </div>
    )
  }

  const lastUpdated = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString('nl-NL')
    : null

  const goldRows   = buildRows(sources, 'gold',   GOLD_ORDER)
  const silverRows = buildRows(sources, 'silver', SILVER_ORDER)

  return (
    <div className="sp-wrap">
      <div className="sp-header">
        <div>
          <h2 className="sp-title">Scrap Buy Prices</h2>
          <p className="sp-subtitle">Price per gram dealers pay for scrap gold &amp; silver</p>
        </div>
        {lastUpdated && <span className="sp-updated">Updated: {lastUpdated}</span>}
      </div>

      <MetalTable metal="Gold" rows={goldRows} sources={sources} colorClass="sp-gold" />
      <MetalTable metal="Silver" rows={silverRows} sources={sources} colorClass="sp-silver" />
    </div>
  )
}

function MetalTable({ metal, rows, sources, colorClass }) {
  if (rows.length === 0) return null

  return (
    <div className="sp-section">
      <h3 className={`sp-metal-heading ${colorClass}`}>{metal}</h3>
      <div className="sp-scroll">
        <table className="sp-table">
          <thead>
            <tr>
              <th>Purity</th>
              {sources.map(src => (
                <th key={src.id}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="sp-source-link">
                    {src.name}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td className="sp-purity">{row.label}</td>
                {row.prices.map(p => (
                  <td key={p.sourceId} className="sp-price">
                    {p.price != null ? (
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {formatPrice(p.price)}
                      </a>
                    ) : (
                      <span className="sp-na">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
