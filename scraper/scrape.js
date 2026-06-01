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

function extractPrice(html, url) {
  const $ = cheerio.load(html)

  // Strategy 1: JSON-LD structured data (most reliable)
  let price = null
  $('script[type="application/ld+json"]').each((_, el) => {
    if (price) return
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
        if (offer?.price) {
          price = parseFloat(String(offer.price).replace(',', '.'))
          return
        }
      }
    } catch {}
  })
  if (price) return price

  // Strategy 2: meta tags
  const metaPrice =
    $('meta[property="product:price:amount"]').attr('content') ||
    $('meta[itemprop="price"]').attr('content') ||
    $('[itemprop="price"]').attr('content')
  if (metaPrice) {
    price = parseFloat(metaPrice.replace(',', '.'))
    if (!isNaN(price)) return price
  }

  // Strategy 3: site-specific CSS selectors
  const selectors = [
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
  for (const sel of selectors) {
    const el = $(sel).first()
    if (!el.length) continue
    const raw = (el.attr('data-price') || el.text()).replace(/[€\s ]/g, '').replace(',', '.')
    const val = parseFloat(raw)
    if (!isNaN(val) && val > 0) return val
  }

  return null
}

async function scrapeUrl(url) {
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    })
    return extractPrice(res.data, url)
  } catch (err) {
    console.error(`  Failed ${url}: ${err.message}`)
    return null
  }
}

// Deduplicate URLs so each unique URL is only fetched once
async function scrapeAll() {
  console.log(`Scraping ${products.length} products across 3 retailers…`)

  // Collect all unique URLs
  const urlMap = new Map() // url -> price
  for (const product of products) {
    for (const url of Object.values(product.retailers)) {
      if (url && !urlMap.has(url)) urlMap.set(url, null)
    }
  }

  console.log(`Fetching ${urlMap.size} unique URLs…`)

  // Fetch with a small delay between requests to be polite
  for (const url of urlMap.keys()) {
    console.log(`  Fetching: ${url}`)
    const price = await scrapeUrl(url)
    urlMap.set(url, price)
    console.log(`  → ${price != null ? `€${price}` : 'not found'}`)
    await new Promise(r => setTimeout(r, 1500))
  }

  // Build output
  const results = products.map(product => ({
    name: product.name,
    prices: Object.fromEntries(
      Object.entries(product.retailers).map(([retailer, url]) => [
        retailer,
        {
          label: RETAILER_LABELS[retailer],
          url,
          price: url ? urlMap.get(url) : null,
        },
      ])
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
