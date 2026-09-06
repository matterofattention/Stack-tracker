import { formatCurrency, formatPct, formatWeight, METAL_LABELS } from '../utils/portfolio'
import './PortfolioSummary.css'

export default function PortfolioSummary({ summary }) {
  const gainKnown = summary.totalGainLoss != null
  const gainPositive = gainKnown && summary.totalGainLoss >= 0

  return (
    <div className="portfolio-summary">
      <div className="summary-card summary-card--main">
        <span className="summary-label">Total invested</span>
        <span className="summary-value">{formatCurrency(summary.totalInvested)}</span>
      </div>
      <div className="summary-card summary-card--main">
        <span className="summary-label">Current value</span>
        <span className="summary-value">{formatCurrency(summary.totalValue)}</span>
        {summary.hasMissingPrices && (
          <span className="summary-note">Spot price unavailable</span>
        )}
      </div>
      <div
        className={`summary-card summary-card--main ${gainKnown ? (gainPositive ? 'is-positive' : 'is-negative') : ''}`}
      >
        <span className="summary-label">Gain / loss</span>
        <span className="summary-value">{formatCurrency(summary.totalGainLoss)}</span>
        <span className="summary-sub">{formatPct(summary.totalGainLossPct)}</span>
      </div>

      {['gold', 'silver'].map((metal) => {
        const m = summary.byMetal[metal]
        const gl = m.value != null ? m.value - m.invested : null
        return (
          <div key={metal} className="summary-card summary-card--metal">
            <span className="summary-label">{METAL_LABELS[metal]}</span>
            <span className="summary-value">{formatCurrency(m.value)}</span>
            <span className="summary-sub">{formatWeight(m.weightGrams)}</span>
            <span className={`summary-sub ${gl == null ? '' : gl >= 0 ? 'is-positive' : 'is-negative'}`}>
              {formatCurrency(gl)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
