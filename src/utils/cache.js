// Module-level in-memory cache — survives page navigation, cleared on full refresh
// Only use for catalog data that changes infrequently (races, swag items).
// Never cache inventory counts, responses, registrations, or events.

const _store = {}
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function getCached(key) {
  const entry = _store[key]
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    delete _store[key]
    return null
  }
  return entry.data
}

export function setCached(key, data, ttlMs = DEFAULT_TTL) {
  _store[key] = { data, expiresAt: Date.now() + ttlMs }
}

// Call this immediately after any write so the next read gets fresh data
export function invalidate(...keys) {
  keys.forEach(k => delete _store[k])
}
