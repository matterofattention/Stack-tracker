import axios from 'axios'
import * as cheerio from 'cheerio'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '../public/scrap-prices.json')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
}

const GOLD_PURITIES = [
  { key: '999', purity: '999/1000', karat: '24k', terms: ['999.9', '999/1000', '24 krt', '24k', '24 karat', '999'] },
  { key: '750', purity: '750/1000', karat: '18k', terms: ['750/1000', '18 krt', '18k', '18 karat', '750'] },
  { key: '585', purity: '585/1000', karat: '14k', terms: ['585/1000', '14 krt', '14k', '14 karat', '585'] },
  { key: '375', purity: '375/1000', karat: '9k',  terms: ['375/1000', '9 krt', '9k', '9 karat', '375'] },
  { key: '333', purity: '333/1000', karat: '8k',  terms: ['333/1000', '8 krt', '8k', '8 karat', '333'] },
]

const SILVER_PURITIES = [
  { key: '999', purity: '999/1000', terms: ['999.9', '999/1000', '.999', '999'] },
  { key: '925', purity: '925/1000', terms: ['925/1000', 'sterling', '.925', '925'] },
  { key: '835', purity: '835/1000', terms: ['835/1000', '.835', '835'] },
  { key: '800', purity: '800/1000', terms: ['800/1000', '.800', '800'] },
]

function parseEuroPrice(text) {
  if (!text) return null
  const cleaned = text.replace(/[€\s ]/g, '').replace(',', '.')
  // Trim any trailing dots or garbage
  const match = cleaned.match(/\d+(\.\d+)?/)
  if (!match) return null
  const val = parseFloat(match[0])
  return isNaN(val) || val <= 0 || val > 200 ? null : val
}

function matchPurity(cellText, purities) {
  const lower = cellText.toLowerCase().replace(/\s+/g, ' ')
  for (const p of purities) {
    for (const term of p.terms) {
      if (lower.includes(term.toLowerCase())) return p
    }
  }
  return null
}

function extractFromSection($, sectionSelector, purities) {
  const results = new Map()
  const section = $(sectionSelector)
  if (!section.length) return results

  // Scan tables within the section
  section.find('tr').each((_, row) => {
    const cells = $(row).find('td, th')
    if (cells.length < 2) return
    const labelText = $(cells.first()).text().trim()
    const priceText = $(cells.eq(1)).text().trim()
    const purity = matchPurity(labelText, purities)
    if (!purity) return
    const price = parseEuroPrice(priceText)
    if (price !== null && !results.has(purity.key)) {
      results.set(purity.key, { ...purity, pricePerGram: price })
    }
  })

  // Scan definition lists / flex pairs
  if (results.size === 0) {
    section.find('dt, [class*="label"], [class*="gehalte"], [class*="karat"]').each((_, el) => {
      const labelText = $(el).text().trim()
      const purity = matchPurity(labelText, purities)
      if (!purity) return
      const priceEl = $(el).next()
      const price = parseEuroPrice(priceEl.text().trim())
      if (price !== null && !results.has(purity.key)) {
        results.set(purity.key, { ...purity, pricePerGram: price })
      }
    })
  }

  return results
}

function extractFromAllTables($, purities) {
  const results = new Map()
  $('table tr').each((_, row) => {
    const cells = $(row).find('td, th')
    if (cells.length < 2) return
    const labelText = $(cells.first()).text().trim()
    const purity = matchPurity(labelText, purities)
    if (!purity) return
    const priceText = $(cells.eq(1)).text().trim()
    const price = parseEuroPrice(priceText)
    if (price !== null && !results.has(purity.key)) {
      results.set(purity.key, { ...purity, pricePerGram: price })
    }
  })
  return results
}

function scrapeXgoud(html) {
  const $ = cheerio.load(html)

  // Try targeted sections first (xgoud.nl uses anchor IDs in the URL)
  let goldMap = extractFromSection($, '#goudprijs-per-gram, [id*="goudprijs"], [id*="gold-price"]', GOLD_PURITIES)
  let silverMap = extractFromSection($, '#zilverprijs-per-gram, [id*="zilverprijs"], [id*="silver-price"]', SILVER_PURITIES)

  // Widen search to the entire body if sections gave nothing
  if (goldMap.size === 0) goldMap = extractFromAllTables($, GOLD_PURITIES)
  if (silverMap.size === 0) silverMap = extractFromAllTables($, SILVER_PURITIES)

  // Sort by canonical purity order
  const sortKeys = arr => arr.map(p => p.key)
  const gold   = GOLD_PURITIES.map(p => goldMap.get(p.key)).filter(Boolean)
  const silver = SILVER_PURITIES.map(p => silverMap.get(p.key)).filter(Boolean)

  return { gold, silver }
}

async function scrapeScrapPrices() {
  console.log('Scraping scrap metal buy prices…')

  const sources = []

  // ── xgoud.nl ──────────────────────────────────────────────────────────────
  console.log('  Fetching https://www.xgoud.nl/')
  try {
    const res = await axios.get('https://www.xgoud.nl/', {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    })
    const { gold, silver } = scrapeXgoud(res.data)
    console.log(`  → Gold: ${gold.length} purities | Silver: ${silver.length} purities`)
    sources.push({ id: 'xgoud', name: 'XGoud', url: 'https://www.xgoud.nl/', gold, silver })
  } catch (err) {
    console.error(`  Failed xgoud.nl: ${err.message}`)
    sources.push({ id: 'xgoud', name: 'XGoud', url: 'https://www.xgoud.nl/', gold: [], silver: [] })
  }

  const output = { lastUpdated: new Date().toISOString(), sources }
  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log('\nDone. Results written to public/scrap-prices.json')
}

scrapeScrapPrices().catch(err => {
  console.error('Scrap scraper failed:', err)
  process.exit(1)
})
