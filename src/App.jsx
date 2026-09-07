import { useCallback, useEffect, useState } from 'react'
import './App.css'
import SpotPriceBar from './components/SpotPriceBar'
import PortfolioSummary from './components/PortfolioSummary'
import HoldingsTable from './components/HoldingsTable'
import HoldingForm from './components/HoldingForm'
import NumistaImportModal from './components/NumistaImportModal'
import { useHoldings } from './hooks/useHoldings'
import { fetchSpotPrices } from './services/spotPrices'
import { fetchNumistaSnapshot } from './services/numistaSnapshot'
import { summarizePortfolio } from './utils/portfolio'

export default function App() {
  const { holdings, addHolding, addHoldings, updateHolding, deleteHolding } = useHoldings()
  const [spotPrices, setSpotPrices] = useState(null)
  const [spotLoading, setSpotLoading] = useState(true)
  const [spotError, setSpotError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState(null)
  const [numistaModalOpen, setNumistaModalOpen] = useState(false)
  const [numistaSnapshot, setNumistaSnapshot] = useState(null)
  const [numistaLoading, setNumistaLoading] = useState(false)
  const [numistaError, setNumistaError] = useState(null)

  const fetchAndSetSpotPrices = useCallback(async () => {
    try {
      const prices = await fetchSpotPrices()
      setSpotPrices(prices)
      setSpotError(null)
    } catch (err) {
      setSpotError(err.message)
    } finally {
      setSpotLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch on mount; state updates happen after the awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAndSetSpotPrices()
  }, [fetchAndSetSpotPrices])

  function handleRefresh() {
    setSpotLoading(true)
    fetchAndSetSpotPrices()
  }

  function handleAddClick() {
    setEditingHolding(null)
    setFormOpen(true)
  }

  function handleEditClick(holding) {
    setEditingHolding(holding)
    setFormOpen(true)
  }

  function handleSubmit(values) {
    if (editingHolding) {
      updateHolding(editingHolding.id, values)
    } else {
      addHolding(values)
    }
    setFormOpen(false)
    setEditingHolding(null)
  }

  function handleDelete(id) {
    if (confirm('Delete this purchase?')) {
      deleteHolding(id)
    }
  }

  async function handleOpenNumistaImport() {
    setNumistaModalOpen(true)
    setNumistaLoading(true)
    setNumistaError(null)
    try {
      const snapshot = await fetchNumistaSnapshot()
      setNumistaSnapshot(snapshot)
    } catch (err) {
      setNumistaError(err.message)
    } finally {
      setNumistaLoading(false)
    }
  }

  function handleNumistaImport(newHoldings) {
    addHoldings(newHoldings)
    setNumistaModalOpen(false)
  }

  const existingNumistaIds = new Set(holdings.map((h) => h.numistaItemId).filter(Boolean))

  const summary = summarizePortfolio(holdings, spotPrices)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stack Tracker</h1>
        <div className="app-header-actions">
          <button className="btn btn--ghost" onClick={handleOpenNumistaImport}>
            Import from Numista
          </button>
          <button className="btn btn--primary" onClick={handleAddClick}>
            + Add purchase
          </button>
        </div>
      </header>

      <SpotPriceBar
        spotPrices={spotPrices}
        loading={spotLoading}
        error={spotError}
        onRefresh={handleRefresh}
      />

      <PortfolioSummary summary={summary} />

      <HoldingsTable
        holdings={holdings}
        currentSpot={spotPrices}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />

      {formOpen && (
        <HoldingForm
          initialValue={editingHolding}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {numistaModalOpen && (
        <NumistaImportModal
          key={numistaLoading ? 'loading' : 'loaded'}
          snapshot={numistaSnapshot}
          loading={numistaLoading}
          error={numistaError}
          existingNumistaIds={existingNumistaIds}
          onImport={handleNumistaImport}
          onCancel={() => setNumistaModalOpen(false)}
        />
      )}
    </div>
  )
}
