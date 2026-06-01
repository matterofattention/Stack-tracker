import { useState, useEffect } from 'react'
import './PriceTable.css'

const RETAILERS = ['101munten', 'goudwisselkantoor', 'hollandgold']
const RETAILER_LABELS = {
  '101munten': '101 Munten',
  'goudwisselkantoor': 'Goudwisselkantoor',
  'hollandgold': 'Holland Gold',
}

// Shipping costs per retailer — update when rates change
const SHIPPING = {
  '101munten':         { cost: null, freeAbove: null, note: '—' },
  'goudwisselkantoor': { cost: null, freeAbove: null, note: '—' },
  'hollandgold':       { cost: null, freeAbove: null, note: '—' },
}

const STOCK_LABELS = {
  in_stock:     { label: 'In stock',    className: 'stock-in' },
  low_stock:    { label: 'Low stock',   className: 'stock-low' },
  preorder:     { label: 'Pre-order',   className: 'stock-pre' },
  out_of_stock: { label: 'Out of stock',className: 'stock-out' },
}

function formatPrice(price) {
  if (price == null) return '—'
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
}

function StockBadge({ status }) {
  if (!status) return <span className="stock-unknown">?</span>
  const { label, className } = STOCK_LABELS[status] ?? { label: status, className: '' }
  return <span className={`stock-badge ${className}`}>{label}</span>
}

function ShippingRow() {
  return (
    <tr className="shipping-row">
      <td className="pt-name">Shipping</td>
      {RETAILERS.map(r => (
        <td key={r} className="pt-shipping">
          {SHIPPING[r].note}
        </td>
      ))}
    </tr>
  )
}

export default function PriceTable() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/matterofattention/Stack-tracker/main/public/prices.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Could not load prices'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="pt-status">Loading prices…</div>
  if (error) return <div className="pt-status error">{error}</div>
  if (!data?.products?.length) return <div className="pt-status">No price data yet — first scrape pending.</div>

  const filtered = data.products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const lastUpdated = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString('nl-NL')
    : null

  return (
    <div className="price-table-wrap">
      <div className="pt-toolbar">
        <input
          className="pt-search"
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {lastUpdated && (
          <span className="pt-updated">Updated: {lastUpdated}</span>
        )}
      </div>

      <div className="pt-scroll">
        <table className="pt-table">
          <thead>
            <tr>
              <th>Product</th>
              {RETAILERS.map(r => <th key={r}>{RETAILER_LABELS[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            <ShippingRow />
            {filtered.map(product => {
              const availablePrices = RETAILERS
                .map(r => product.prices[r]?.price)
                .filter(p => p != null)
              const minPrice = availablePrices.length ? Math.min(...availablePrices) : null

              return (
                <tr key={product.name}>
                  <td className="pt-name">{product.name}</td>
                  {RETAILERS.map(r => {
                    const entry = product.prices[r]
                    const isLowest = entry?.price != null && entry.price === minPrice && availablePrices.length > 1
                    return (
                      <td key={r} className={`pt-price ${isLowest ? 'lowest' : ''}`}>
                        {entry?.url ? (
                          <>
                            <a href={entry.url} target="_blank" rel="noopener noreferrer">
                              {formatPrice(entry.price)}
                            </a>
                            <StockBadge status={entry.inStock} />
                          </>
                        ) : (
                          <span className="pt-na">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
