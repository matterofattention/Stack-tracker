export const METALS = ['gold', 'silver']

export const METAL_LABELS = {
  gold: 'Gold',
  silver: 'Silver',
}

export function totalWeightGrams(holding) {
  return holding.weightGrams * holding.quantity
}

// currentSpot: { gold: { pricePerGram }, silver: { pricePerGram } }
export function currentValue(holding, currentSpot) {
  const pricePerGram = currentSpot?.[holding.metal]?.pricePerGram
  if (pricePerGram == null) return null
  return totalWeightGrams(holding) * pricePerGram
}

export function gainLoss(holding, currentSpot) {
  const value = currentValue(holding, currentSpot)
  if (value == null) return null
  const amount = value - holding.totalPaid
  const pct = holding.totalPaid > 0 ? (amount / holding.totalPaid) * 100 : 0
  return { amount, pct }
}

export function summarizePortfolio(holdings, currentSpot) {
  const summary = {
    totalInvested: 0,
    totalValue: 0,
    byMetal: {
      gold: { invested: 0, value: 0, weightGrams: 0 },
      silver: { invested: 0, value: 0, weightGrams: 0 },
    },
    hasMissingPrices: false,
  }

  for (const holding of holdings) {
    const metalSummary = summary.byMetal[holding.metal]
    summary.totalInvested += holding.totalPaid
    metalSummary.invested += holding.totalPaid
    metalSummary.weightGrams += totalWeightGrams(holding)

    const value = currentValue(holding, currentSpot)
    if (value == null) {
      summary.hasMissingPrices = true
      continue
    }
    summary.totalValue += value
    metalSummary.value += value
  }

  // Missing spot prices mean we don't actually know the value of (some of)
  // the holdings, so treat the totals as unknown rather than implying they're
  // worth nothing — that would otherwise show as a false, huge loss.
  if (summary.hasMissingPrices) {
    summary.totalValue = null
    summary.totalGainLoss = null
    summary.totalGainLossPct = null
    for (const metal of METALS) {
      summary.byMetal[metal].value = null
    }
  } else {
    summary.totalGainLoss = summary.totalValue - summary.totalInvested
    summary.totalGainLossPct =
      summary.totalInvested > 0 ? (summary.totalGainLoss / summary.totalInvested) * 100 : 0
  }

  return summary
}

export function formatCurrency(amount) {
  if (amount == null || Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatWeight(grams) {
  if (grams == null || Number.isNaN(grams)) return '—'
  if (grams >= 1000) return `${(grams / 1000).toFixed(3)} kg`
  return `${grams.toFixed(2)} g`
}

export function formatPct(pct) {
  if (pct == null || Number.isNaN(pct)) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}
