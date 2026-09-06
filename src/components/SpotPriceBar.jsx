import { formatCurrency, formatPct, METAL_LABELS } from '../utils/portfolio'
import './SpotPriceBar.css'

export default function SpotPriceBar({ spotPrices, loading, error, onRefresh }) {
  return (
    <div className="spot-price-bar">
      {['gold', 'silver'].map((metal) => {
        const quote = spotPrices?.[metal]
        return (
          <div key={metal} className={`spot-price-card spot-price-card--${metal}`}>
            <span className="spot-price-label">{METAL_LABELS[metal]} / g</span>
            {loading && !quote ? (
              <span className="spot-price-value spot-price-value--loading">Loading…</span>
            ) : quote ? (
              <>
                <span className="spot-price-value">{formatCurrency(quote.pricePerGram)}</span>
                <span
                  className={`spot-price-change ${
                    quote.changePct >= 0 ? 'spot-price-change--up' : 'spot-price-change--down'
                  }`}
                >
                  {formatPct(quote.changePct)}
                </span>
              </>
            ) : (
              <span className="spot-price-value spot-price-value--error">Unavailable</span>
            )}
          </div>
        )
      })}
      <button className="spot-price-refresh" onClick={onRefresh} disabled={loading} title="Refresh spot prices">
        ↻
      </button>
      {error && <span className="spot-price-error">Couldn't fetch live prices — showing cached values.</span>}
    </div>
  )
}
