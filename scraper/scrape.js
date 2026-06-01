import axios from 'axios'
import * as cheerio from 'cheerio'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const products = JSON.parse(readFileSync(join(__dirname, 'products.json'), 'utf8'))
const outputPath = join(__dirname, '../public/prices.json')

const RETAILER_LABELS = {
  '101munten': '101 Munten',
  'goudwisselkantoor': 'Goudwisselkantoor',
  'hollandgold': 'Holland Gold',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
}

// Schema.org availability URIs -> simple status
const AVAILABILITY_MAP = {
  'instock':           'in_stock',
  'inStockOnlineOnly': 'in_stock',
  'limitedavailability': 'low_stock',
  'presale':           'preorder',
  'preorder':          'preorder',
  'preorder':          'preorder',
  'outofstock':        'out_of_stock',
  'discontinued':      'out_of_stock',
  'soldout':           'out_of_stock',
}

function normaliseAvailability(raw) {
  if (!raw) return null
  const key = raw.replace(/^https?:\/\/schema\.org\//i, '').toLowerCase()
  return AVAILABILITY_MAP[key] ?? null
}

function extractData(html) {
  const $ = cheerio.load(html)

  let price = null
  let inStock = null

  // Strategy 1: JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    if (price !== null) return
    try {
      const data = JSON.parse($(el).html())
      const candidates = Array.isArray(data) ? data : [data]
      for (const item of candidates) {
        const entity = item['@type'] === 'Product' ? item
          : item['@graph']?.find(n => n['@type'] === 'Product')
        if (!entity) continue
        const offers = entity.offers
        if (!offers) continue
        const offer = Array.isArray(offers) ? offers[0] : offers
        if (offer?.price != null) {
          price = parseFloat(String(offer.price).replace(',', '.'))
        }
        if (offer?.availability != null) {
          inStock = normaliseAvailability(offer.availability)
        }
        if (price !== null) return
      }
    } catch {}
  })

  // Strategy 2: meta / microdata tags
  if (price === null) {
    const metaPrice =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[itemprop="price"]').attr('content') ||
      $('[itemprop="price"]').attr('content')
    if (metaPrice) {
      const val = parseFloat(metaPrice.replace(',', '.'))
      if (!isNaN(val)) price = val
    }
  }

  if (inStock === null) {
    const metaAvail =
      $('meta[property="product:availability"]').attr('content') ||
      $('[itemprop="availability"]').attr('content') ||
      $('[itemprop="availability"]').attr('href')
    inStock = normaliseAvailability(metaAvail)
  }

  // Strategy 3: CSS selectors for price
  if (price === null) {
    const priceSelectors = [
      '.woocommerce-Price-amount bdi',
      '.woocommerce-Price-amount',
      '[data-price]',
      '.product-price .price',
      '.price--product',
      '.current-price',
      '.product__price',
      'span.price',
      '.price',
    ]
    for (const sel of priceSelectors) {
      const el = $(sel).first()
      if (!el.length) continue
      const raw = (el.attr('data-price') || el.text()).replace(/[€\s ]/g, '').replace(',', '.')
      const val = parseFloat(raw)
      if (!isNaN(val) && val > 0) { price = val; break }
    }
  }

  // Strategy 4: CSS selectors for stock status
  if (inStock === null) {
    if ($('.stock.in-stock, .in-stock, [class*="in-stock"], [class*="instock"]').length) {
      inStock = 'in_stock'
    } else if ($('.stock.out-of-stock, .out-of-stock, [class*="out-of-stock"], [class*="outofstock"], .sold-out').length) {
      inStock = 'out_of_stock'
    }
  }

  return { price, inStock }
}

async function scrapeUrl(url) {
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    })
    return extractData(res.data)
  } catch (err) {
    console.error(`  Failed ${url}: ${err.message}`)
    return { price: null, inStock: null }
  }
}

async function scrapeAll() {
  console.log(`Scraping ${products.length} products across 3 retailers…`)

  // Collect unique URLs
  const urlMap = new Map() // url -> { price, inStock }
  for (const product of products) {
    for (const url of Object.values(product.retailers)) {
      if (url && !urlMap.has(url)) urlMap.set(url, null)
    }
  }

  console.log(`Fetching ${urlMap.size} unique URLs…`)

  for (const url of urlMap.keys()) {
    console.log(`  Fetching: ${url}`)
    const result = await scrapeUrl(url)
    urlMap.set(url, result)
    console.log(`  → price: ${result.price != null ? `€${result.price}` : 'not found'} | stock: ${result.inStock ?? 'unknown'}`)
    await new Promise(r => setTimeout(r, 1500))
  }

  const results = products.map(product => ({
    name: product.name,
    prices: Object.fromEntries(
      Object.entries(product.retailers).map(([retailer, url]) => {
        const scraped = url ? urlMap.get(url) : null
        return [retailer, {
          label: RETAILER_LABELS[retailer],
          url,
          price: scraped?.price ?? null,
          inStock: scraped?.inStock ?? null,
        }]
      })
    ),
  }))

  const output = {
    lastUpdated: new Date().toISOString(),
    products: results,
  }

  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nDone. Results written to public/prices.json`)
}

scrapeAll().catch(err => {
  console.error('Scraper failed:', err)
  process.exit(1)
})
