// Spot prices are derived from Yahoo Finance futures quotes (USD per troy
// ounce), proxied through a Cloudflare Worker to get around Yahoo's CORS
// restrictions, then converted to EUR per gram for display and portfolio math.
const WORKER_URL = 'https://icy-waterfall-4c47.aron-bd2.workers.dev'
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const FX_URL = 'https://api.frankfurter.app/latest?from=USD&to=EUR'

const TROY_OUNCE_IN_GRAMS = 31.1034768
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export const METAL_SYMBOLS = {
  gold: 'GC=F',
  silver: 'SI=F',
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // localStorage full or unavailable — ignore, we just lose caching
  }
}

async function fetchYahooQuote(symbol) {
  const cacheKey = `st_quote_${symbol}`
  const cached = readCache(cacheKey)
  if (cached) return cached

  const url = `${YAHOO_CHART_URL}${encodeURIComponent(symbol)}?range=5d&interval=1d`
  const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${symbol}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const meta = result.meta
  const data = {
    currency: meta.currency,
    currentPrice: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose,
  }

  writeCache(cacheKey, data)
  return data
}

async function fetchUsdToEurRate() {
  const cacheKey = 'st_fx_usd_eur'
  const cached = readCache(cacheKey)
  if (cached) return cached

  const res = await fetch(FX_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching FX rate`)
  const json = await res.json()
  const rate = json?.rates?.EUR
  if (!rate) throw new Error('No EUR rate in FX response')

  writeCache(cacheKey, rate)
  return rate
}

function usdPerOzToEurPerGram(usdPerOz, fxRate) {
  return (usdPerOz * fxRate) / TROY_OUNCE_IN_GRAMS
}

// Returns { gold: { pricePerGram, changePct }, silver: { ... } }, prices in EUR/gram.
export async function fetchSpotPrices() {
  const [goldQuote, silverQuote, fxRate] = await Promise.all([
    fetchYahooQuote(METAL_SYMBOLS.gold),
    fetchYahooQuote(METAL_SYMBOLS.silver),
    fetchUsdToEurRate(),
  ])

  const toMetalPrice = (quote) => {
    const pricePerGram = usdPerOzToEurPerGram(quote.currentPrice, fxRate)
    const previousPricePerGram = usdPerOzToEurPerGram(quote.previousClose, fxRate)
    const changePct = ((pricePerGram - previousPricePerGram) / previousPricePerGram) * 100
    return { pricePerGram, changePct }
  }

  return {
    gold: toMetalPrice(goldQuote),
    silver: toMetalPrice(silverQuote),
    updatedAt: Date.now(),
  }
}
