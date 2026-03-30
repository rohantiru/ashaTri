import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { COMPLETION_MAP } from './plans'
import { getCached, setCached, invalidate } from './cache'

const STRAVA_TO_PLAN_SPORT = {}
Object.entries(COMPLETION_MAP).forEach(([planSport, stravaTypes]) => {
  stravaTypes.forEach(t => { STRAVA_TO_PLAN_SPORT[t] = planSport })
})

function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toMeters(distance, unit) {
  if (!distance) return 0
  switch (unit) {
    case 'km': return distance * 1000
    case 'mi': return distance * 1609.34
    case 'yd': return distance * 0.9144
    case 'm':  return distance
    default:   return distance * 1609.34 // default mi
  }
}

/**
 * Compute per-week, per-sport planned vs actual stats.
 * planMap:     { 'YYYY-MM-DD': [{ sport, duration, distance, distanceUnit }] }
 * activityMap: { 'YYYY-MM-DD': [Strava activity: { type, moving_time, distance }] }
 * Returns: { weeks: { 'monday-YYYY-MM-DD': { Sport: { planned, plannedMins, plannedDistM, actual, actualMins, actualDistM } } } }
 */
export function computeStats(planMap, activityMap) {
  const weeks = {}

  // Planned sessions → aggregate by week + sport
  Object.entries(planMap).forEach(([date, sessions]) => {
    const wk = mondayOf(date)
    if (!weeks[wk]) weeks[wk] = {}
    sessions.forEach(s => {
      if (!s.sport) return
      if (!weeks[wk][s.sport]) {
        weeks[wk][s.sport] = { planned: 0, plannedMins: 0, plannedDistM: 0, actual: 0, actualMins: 0, actualDistM: 0 }
      }
      weeks[wk][s.sport].planned++
      weeks[wk][s.sport].plannedMins += s.duration || 0
      weeks[wk][s.sport].plannedDistM += toMeters(s.distance || 0, s.distanceUnit || 'mi')
    })
  })

  // Strava activities → only count if that sport is planned in the same week
  Object.entries(activityMap).forEach(([date, activities]) => {
    const wk = mondayOf(date)
    if (!weeks[wk]) return
    activities.forEach(a => {
      const planSport = STRAVA_TO_PLAN_SPORT[a.type] || a.type
      if (!weeks[wk][planSport]) return
      weeks[wk][planSport].actual++
      weeks[wk][planSport].actualMins += Math.round((a.moving_time || 0) / 60)
      weeks[wk][planSport].actualDistM += a.distance || 0
    })
  })

  return { weeks }
}

/** Compute stats and save to athleteStats/{uid}. Fire-and-forget safe. */
export async function saveAthleteStats(uid, planMap, activityMap) {
  const stats = computeStats(planMap, activityMap)
  await setDoc(doc(db, 'athleteStats', uid), {
    uid,
    ...stats,
    updatedAt: serverTimestamp(),
  })
  invalidate(`athleteStats_${uid}`)
}

async function getAthleteStats(uid) {
  const cacheKey = `athleteStats_${uid}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached
  const snap = await getDoc(doc(db, 'athleteStats', uid))
  const result = snap.exists() ? { uid, ...snap.data() } : null
  setCached(cacheKey, result, 30 * 60 * 1000)
  return result
}

export async function getTeamStats(memberIds) {
  return Promise.all(memberIds.map(uid => getAthleteStats(uid).catch(() => null)))
}
