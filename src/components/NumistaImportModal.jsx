import { useMemo, useState } from 'react'
import { formatWeight, METAL_LABELS } from '../utils/portfolio'
import './NumistaImportModal.css'

export default function NumistaImportModal({ snapshot, loading, error, existingNumistaIds, onImport, onCancel }) {
  const importableItems = useMemo(
    () => (snapshot?.items ?? []).filter((item) => !existingNumistaIds.has(item.numistaItemId)),
    [snapshot, existingNumistaIds],
  )
  const alreadyImportedCount = (snapshot?.items?.length ?? 0) - importableItems.length

  const [selected, setSelected] = useState(() => new Set(importableItems.map((item) => item.numistaItemId)))

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleImport() {
    const today = new Date().toISOString().slice(0, 10)
    const holdings = importableItems
      .filter((item) => selected.has(item.numistaItemId))
      .map((item) => {
        const noteParts = [item.notes]
        if (item.totalPaid == null) {
          noteParts.push('No price recorded in Numista — verify purchase price')
        } else if (item.priceCurrency && item.priceCurrency !== 'EUR') {
          noteParts.push(`Price recorded in Numista as ${item.priceCurrency} — verify EUR amount`)
        }
        noteParts.push('Purchase date not recorded in Numista — verify')

        return {
          numistaItemId: item.numistaItemId,
          metal: item.metal,
          form: item.form,
          name: item.name,
          mint: item.mint,
          weightGrams: item.weightGrams,
          quantity: item.quantity,
          totalPaid: item.totalPaid ?? 0,
          purchaseDate: today,
          dealer: '',
          notes: noteParts.filter(Boolean).join(' · '),
        }
      })
    onImport(holdings)
  }

  return (
    <div className="numista-modal-backdrop" onClick={onCancel}>
      <div className="numista-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Import from Numista</h2>

        {loading && <p className="numista-empty">Loading last sync…</p>}

        {!loading && error && (
          <p className="numista-warning">Couldn't load the Numista snapshot: {error}</p>
        )}

        {!loading && !error && !snapshot && (
          <p className="numista-empty">
            No Numista sync found yet. Run the "Sync Numista collection" GitHub Action, then reload this page.
          </p>
        )}

        {!loading && !error && snapshot && (
          <>
            <p className="numista-meta">
              Last synced {new Date(snapshot.syncedAt).toLocaleString()}
              {alreadyImportedCount > 0 && ` · ${alreadyImportedCount} already imported`}
            </p>

            {importableItems.length === 0 ? (
              <p className="numista-empty">Everything from your last sync has already been imported.</p>
            ) : (
              <ul className="numista-item-list">
                {importableItems.map((item) => (
                  <li key={item.numistaItemId} className="numista-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.has(item.numistaItemId)}
                        onChange={() => toggle(item.numistaItemId)}
                      />
                      <span className="numista-item-main">
                        <span className="numista-item-name">
                          {item.quantity > 1 ? `${item.quantity}× ` : ''}
                          {item.name}
                        </span>
                        <span className={`metal-tag metal-tag--${item.metal}`}>{METAL_LABELS[item.metal]}</span>
                        <span className="numista-item-weight">
                          {formatWeight(item.weightGrams * item.quantity)} fine ({item.finenessPerMille}‰)
                        </span>
                      </span>
                      {item.totalPaid == null && (
                        <span className="numista-warning">No price recorded — you'll need to add it</span>
                      )}
                      {item.totalPaid != null && item.priceCurrency !== 'EUR' && (
                        <span className="numista-warning">Price in {item.priceCurrency}, not EUR</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {snapshot.needsReview?.length > 0 && (
              <details className="numista-needs-review">
                <summary>{snapshot.needsReview.length} item(s) couldn't be auto-imported</summary>
                <ul>
                  {snapshot.needsReview.map((item) => (
                    <li key={item.numistaItemId}>
                      {item.name ? `${item.name}: ` : ''}
                      {item.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        <div className="numista-modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          {importableItems.length > 0 && (
            <button type="button" className="btn btn--primary" onClick={handleImport} disabled={selected.size === 0}>
              Import {selected.size} item{selected.size === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
