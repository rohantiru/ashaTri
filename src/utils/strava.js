import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

const MIN_YEAR = 2026
const JAN_2026_TS = 1735689600 // 2026-01-01 00:00:00 UTC
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour — only applied to current month

function cacheDocId(year, month) {
  return `${year}${String(month + 1).padStart(2, '0')}`
}

// Only store the fields we need — keeps Firestore docs small
function slimActivity(a) {
  return {
    id: a.id,
    name: a.name || '',
    type: a.type,
    start_date_local: a.start_date_local,
    distance: a.distance || 0,
    moving_time: a.moving_time || 0,
    average_speed: a.average_speed || 0,
    total_elevation_gain: a.total_elevation_gain || 0,
    average_watts: a.average_watts || null,   // null if no power meter
    device_watts: a.device_watts || false,    // true = real power meter, false = estimated
  }
}

// Returns all activities across every cached month (for baselines computation)
export async function getAllCachedActivities() {
  const snap = await getDocs(collection(db, 'stravaCache'))
  const activities = []
  snap.docs.forEach(d => {
    const { activities: acts } = d.data()
    if (Array.isArray(acts)) activities.push(...acts)
  })
  return activities
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function stravaStatus() {
  try {
    const snap = await getDoc(doc(db, 'secrets', 'strava'))
    if (!snap.exists()) return { connected: false }
    return { connected: !!snap.data().refreshToken }
  } catch {
    return { connected: false }
  }
}

export async function exchangeCode(code) {
  const res = await fetch('/api/strava-token?action=exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)

  await setDoc(doc(db, 'secrets', 'strava'), {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  }, { merge: true })
}

async function getValidAccessToken() {
  const snap = await getDoc(doc(db, 'secrets', 'strava'))
  if (!snap.exists()) throw new Error('Strava not connected')
  const { accessToken, refreshToken, expiresAt } = snap.data()

  // Still valid for > 5 minutes
  if (accessToken && expiresAt && Date.now() / 1000 < expiresAt - 300) {
    return accessToken
  }

  const res = await fetch('/api/strava-token?action=refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)

  await setDoc(doc(db, 'secrets', 'strava'), {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  }, { merge: true })

  return data.access_token
}

// ── Activities (with Firestore cache) ─────────────────────────────────────────

export async function getActivitiesForMonth(year, month, forceRefresh = false) {
  if (year < MIN_YEAR) return []

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const cacheRef = doc(db, 'stravaCache', cacheDocId(year, month))

  // Cache check — past months cache forever; current month expires after 1 hour
  if (!forceRefresh) {
    const cacheSnap = await getDoc(cacheRef)
    if (cacheSnap.exists()) {
      const { activities, fetchedAt } = cacheSnap.data()
      const fetchedMs = fetchedAt?.toMillis?.() ?? 0
      const stale = isCurrentMonth && Date.now() - fetchedMs > CACHE_TTL_MS
      if (!stale) return activities
    }
  }

  // Fetch from Strava API
  const token = await getValidAccessToken()

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
  const afterTs = Math.max(Math.floor(monthStart.getTime() / 1000), JAN_2026_TS)
  const beforeTs = Math.floor(monthEnd.getTime() / 1000)

  const url = new URL('https://www.strava.com/api/v3/athlete/activities')
  url.searchParams.set('after', String(afterTs))
  url.searchParams.set('before', String(beforeTs))
  url.searchParams.set('per_page', '200')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const raw = await res.json()
  if (!Array.isArray(raw)) throw new Error(raw.message || 'Strava API error')

  const activities = raw.map(slimActivity)

  // Write to cache
  await setDoc(cacheRef, {
    activities,
    fetchedAt: new Date(),
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
  })

  return activities
}

// ── OAuth URL builder ─────────────────────────────────────────────────────────

export function buildStravaAuthUrl(redirectUri) {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID
  if (!clientId) throw new Error('VITE_STRAVA_CLIENT_ID not set in environment')
  const url = new URL('https://www.strava.com/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'activity:read_all')
  url.searchParams.set('approval_prompt', 'auto')
  return url.toString()
}
