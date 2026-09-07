// Fetches the authenticated user's Numista coin collection and writes a
// snapshot to public/numista-collection.json for the app to read and offer
// as an import source, alongside manual entry.
//
// Requires NUMISTA_API_KEY and NUMISTA_CLIENT_ID env vars (repo secrets).
// Mints a short-lived OAuth token via the client_credentials grant with
// scope=view_collection, per Numista's documented "self" token flow for
// accessing your own collection without a full user-facing OAuth redirect.
import { writeFileSync } from 'fs'

const API_KEY = process.env.NUMISTA_API_KEY
const CLIENT_ID = process.env.NUMISTA_CLIENT_ID
const API_BASE = 'https://api.numista.com/v3'
const OUTPUT_PATH = new URL('../public/numista-collection.json', import.meta.url)

if (!API_KEY || !CLIENT_ID) {
  console.error('Missing NUMISTA_API_KEY or NUMISTA_CLIENT_ID environment variables.')
  process.exit(1)
}

async function getAccessToken() {
  const res = await fetch(`${API_BASE}/oauth_token`, {
    method: 'POST',
    headers: {
      'Numista-Api-Key': API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      scope: 'view_collection',
    }),
  })
  if (!res.ok) {
    throw new Error(`Token request failed: HTTP ${res.status} — ${await res.text()}`)
  }
  return res.json()
}

async function fetchAllCollectedItems(userId, token) {
  const items = []
  const count = 100
  let page = 1

  while (true) {
    const url = `${API_BASE}/users/${userId}/collected_items?category=coin&count=${count}&page=${page}`
    const res = await fetch(url, {
      headers: {
        'Numista-Api-Key': API_KEY,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      throw new Error(`Collected items request failed: HTTP ${res.status} — ${await res.text()}`)
    }
    const data = await res.json()
    const pageItems = data.items ?? []
    items.push(...pageItems)
    if (pageItems.length < count) break
    page += 1
  }

  return items
}

const typeCache = new Map()

async function fetchType(typeId) {
  if (typeCache.has(typeId)) return typeCache.get(typeId)
  const res = await fetch(`${API_BASE}/types/${typeId}?lang=en`, {
    headers: { 'Numista-Api-Key': API_KEY },
  })
  if (!res.ok) {
    throw new Error(`Type ${typeId} request failed: HTTP ${res.status} — ${await res.text()}`)
  }
  const data = await res.json()
  typeCache.set(typeId, data)
  return data
}

// Parses a Numista composition string (e.g. "Silver (0.925)", "925‰ Silver",
// "Copper-nickel") into a metal + fineness fraction. Returns { skip: true,
// reason } for anything that isn't cleanly solid gold or silver, rather than
// guessing — a plated or bimetallic coin valued as solid metal by weight
// would badly overstate its worth.
function parseComposition(text) {
  if (!text) return { skip: true, reason: 'no composition data' }
  const lower = text.toLowerCase()

  if (/plat(e|ed)|clad|filled|vermeil/.test(lower)) {
    return { skip: true, reason: `plated/clad composition, not solid metal: "${text}"` }
  }

  const hasGold = /\bgold\b/.test(lower)
  const hasSilver = /\bsilver\b/.test(lower)

  if (hasGold && hasSilver) {
    return { skip: true, reason: `bimetallic gold+silver composition: "${text}"` }
  }

  const metal = hasGold ? 'gold' : hasSilver ? 'silver' : null
  if (!metal) {
    return { skip: true, reason: `composition is not gold or silver: "${text}"` }
  }

  let fineness = null
  let m
  if ((m = lower.match(/(\d{2,3})\s*‰/))) {
    fineness = parseInt(m[1], 10) / 1000
  } else if ((m = lower.match(/(\d{2,3})\s*\/\s*1000/))) {
    fineness = parseInt(m[1], 10) / 1000
  } else if ((m = lower.match(/0?\.(\d{2,3})/))) {
    fineness = parseFloat(`0.${m[1]}`)
  } else if ((m = lower.match(/(\d{1,3})\s*%/))) {
    fineness = parseInt(m[1], 10) / 100
  } else if (lower.includes('pure') || lower.trim() === metal) {
    fineness = 1
  }

  if (fineness == null) {
    return { skip: true, reason: `could not parse fineness from composition: "${text}"` }
  }

  return { metal, fineness, skip: false }
}

async function main() {
  const tokenData = await getAccessToken()
  const userId = tokenData.user_id
  if (!userId) {
    throw new Error(`Token response did not include a user_id: ${JSON.stringify(tokenData)}`)
  }

  const collectedItems = await fetchAllCollectedItems(userId, tokenData.token)

  const items = []
  const needsReview = []

  for (const item of collectedItems) {
    const typeId = item.type?.id
    if (!typeId) {
      needsReview.push({ numistaItemId: item.id, reason: 'missing catalogue type id' })
      continue
    }

    let typeDetail
    try {
      typeDetail = await fetchType(typeId)
    } catch (err) {
      needsReview.push({ numistaItemId: item.id, reason: `failed to fetch type ${typeId}: ${err.message}` })
      continue
    }

    const parsed = parseComposition(typeDetail.composition?.text ?? null)
    if (parsed.skip) {
      needsReview.push({ numistaItemId: item.id, name: typeDetail.title, reason: parsed.reason })
      continue
    }

    const catalogWeightGrams = typeDetail.weight ?? null
    if (catalogWeightGrams == null) {
      needsReview.push({
        numistaItemId: item.id,
        name: typeDetail.title,
        reason: 'catalogue entry has no weight data',
      })
      continue
    }

    items.push({
      numistaItemId: item.id,
      metal: parsed.metal,
      form: 'coin',
      name: typeDetail.title,
      mint: typeDetail.issuer?.name ?? '',
      catalogWeightGrams,
      finenessPerMille: Math.round(parsed.fineness * 1000),
      weightGrams: Number((catalogWeightGrams * parsed.fineness).toFixed(4)),
      quantity: item.quantity ?? 1,
      totalPaid: item.price?.value ?? null,
      priceCurrency: item.price?.currency ?? null,
      notes: item.comment ?? '',
    })
  }

  const snapshot = {
    syncedAt: new Date().toISOString(),
    items,
    needsReview,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2))
  console.log(`Synced ${items.length} item(s) from Numista, ${needsReview.length} need manual review.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
