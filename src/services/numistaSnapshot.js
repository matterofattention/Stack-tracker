// Reads the static snapshot committed by the "Sync Numista collection"
// GitHub Action (scripts/sync-numista.js). The actual Numista API call never
// happens in the browser — it needs an OAuth client secret/ID that can't
// safely live in a client-side bundle, so the sync runs server-side in
// Actions and just publishes its result here as a plain JSON file.
export async function fetchNumistaSnapshot() {
  const res = await fetch('/numista-collection.json', { cache: 'no-store' })
  if (res.status === 404) return null // never synced yet
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching Numista snapshot`)
  return res.json()
}
