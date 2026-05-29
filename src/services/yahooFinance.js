// Replace with your Cloudflare Worker URL once deployed
const WORKER_URL = 'https://icy-waterfall-4c47.aron-bd2.workers.dev'
const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const RANGE_PARAMS = {
  '1W': { range: '5d',  interval: '1d'  },
  '1M': { range: '1mo', interval: '1d'  },
  '3M': { range: '3mo', interval: '1d'  },
  '1Y': { range: '1y',  interval: '1wk' },
  '5Y': { range: '5y',  interval: '1wk' },
}

function cacheKey(symbol, range) {
  return `st_${symbol}_${range}`
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
    // localStorage full — ignore
  }
}

export async function fetchQuote(symbol, range = '5Y') {
  const key = cacheKey(symbol, range)
  const cached = readCache(key)
  if (cached) return cached

  const { range: r, interval } = RANGE_PARAMS[range]
  const url = `${BASE_URL}${encodeURIComponent(symbol)}?range=${r}&interval=${interval}&includePrePost=false`

  const res = await fetch(`${WORKER_URL}?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(`No data for ${symbol}`)

  const timestamps = result.timestamp
  const closes = result.indicators.quote[0].close
  const meta = result.meta

  const prices = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      price: closes[i],
    }))
    .filter(p => p.price != null)

  const data = {
    symbol,
    currency: meta.currency,
    currentPrice: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose,
    prices,
  }

  writeCache(key, data)
  return data
}

export const TICKERS = ['SI=F', 'GC=F', 'PA=F', 'PL=F', 'GDJX', 'GDX', 'GLD', 'XLF', 'GSR']

export const TICKER_NAMES = {
  'SI=F':  'Silver Futures',
  'GC=F':  'Gold Futures',
  'PA=F':  'Palladium Futures',
  'PL=F':  'Platinum Futures',
  'GDJX':  'Gold Miners Jr (GDJX)',
  'GDX':   'Gold Miners ETF',
  'GLD':   'Gold ETF',
  'XLF':   'Financials ETF',
  'GSR':   'Gold/Silver Ratio',
}

export const RANGES = ['1W', '1M', '3M', '1Y', '5Y']

// Derives the Gold/Silver ratio from already-fetched GC=F and SI=F data.
// Aligns by date since the two series may not have identical timestamps.
export function computeGSR(goldData, silverData) {
  const silverByDate = Object.fromEntries(silverData.prices.map(p => [p.date, p.price]))
  const prices = goldData.prices
    .filter(p => silverByDate[p.date])
    .map(p => ({ date: p.date, price: p.price / silverByDate[p.date] }))

  const currentRatio = goldData.currentPrice / silverData.currentPrice
  const previousRatio = goldData.previousClose / silverData.previousClose

  return {
    symbol: 'GSR',
    currency: '',
    currentPrice: currentRatio,
    previousClose: previousRatio,
    prices,
  }
}
