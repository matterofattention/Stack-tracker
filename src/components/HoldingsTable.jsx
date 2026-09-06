import {
  currentValue,
  formatCurrency,
  formatPct,
  formatWeight,
  gainLoss,
  METAL_LABELS,
  totalWeightGrams,
} from '../utils/portfolio'
import './HoldingsTable.css'

export default function HoldingsTable({ holdings, currentSpot, onEdit, onDelete }) {
  if (holdings.length === 0) {
    return (
      <div className="holdings-empty">
        No purchases yet. Add your first gold or silver purchase to start tracking.
      </div>
    )
  }

  const sorted = [...holdings].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))

  return (
    <div className="holdings-table-wrapper">
      <table className="holdings-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Metal</th>
            <th>Weight</th>
            <th>Purchase date</th>
            <th>Paid</th>
            <th>Value now</th>
            <th>Gain / loss</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((holding) => {
            const value = currentValue(holding, currentSpot)
            const gl = gainLoss(holding, currentSpot)
            return (
              <tr key={holding.id}>
                <td>
                  <div className="holding-name">{holding.name}</div>
                  {(holding.mint || holding.quantity > 1) && (
                    <div className="holding-meta">
                      {holding.quantity > 1 ? `${holding.quantity}× ` : ''}
                      {holding.mint}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`metal-tag metal-tag--${holding.metal}`}>
                    {METAL_LABELS[holding.metal]}
                  </span>
                </td>
                <td>{formatWeight(totalWeightGrams(holding))}</td>
                <td>{holding.purchaseDate}</td>
                <td>{formatCurrency(holding.totalPaid)}</td>
                <td>{value != null ? formatCurrency(value) : '—'}</td>
                <td className={gl && gl.amount >= 0 ? 'is-positive' : 'is-negative'}>
                  {gl ? (
                    <>
                      {formatCurrency(gl.amount)}
                      <div className="holding-meta">{formatPct(gl.pct)}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="holdings-actions">
                  <button className="icon-btn" onClick={() => onEdit(holding)} title="Edit">
                    ✎
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => onDelete(holding.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
