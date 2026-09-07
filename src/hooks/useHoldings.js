import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'stack-tracker:holdings'

function loadHoldings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHoldings(holdings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  } catch {
    // localStorage full or unavailable — changes won't persist across reloads
  }
}

export function useHoldings() {
  const [holdings, setHoldings] = useState(loadHoldings)

  useEffect(() => {
    saveHoldings(holdings)
  }, [holdings])

  const addHolding = useCallback((holding) => {
    const newHolding = { ...holding, id: crypto.randomUUID() }
    setHoldings((prev) => [...prev, newHolding])
  }, [])

  const updateHolding = useCallback((id, updates) => {
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)))
  }, [])

  const deleteHolding = useCallback((id) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id))
  }, [])

  return { holdings, addHolding, updateHolding, deleteHolding }
}
