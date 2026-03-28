import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { COMPLETION_MAP } from './plans'
import { getCached, setCached, invalidate } from './cache'

// Invert COMPLETION_MAP: Strava activity type → plan sport
const STRAVA_TO_PLAN_SPORT = {}
Object.entries(COMPLETION_MAP).forEach(([planSport, stravaTypes]) => {
  stravaTypes.forEach(t => { STRAVA_TO_PLAN_SPORT[t] = planSport })
})

/**
 * Compute planned vs actual aggregates, including per-week and per-session breakdown.
 * activities = all of the user's Strava activities (any date range — filtered internally).
 */
function dk(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Compute planned vs actual weekly volume aggregates.
 * Matching is date-range based (any activity in the week counts toward that sport)
 * rather than per-session — more forgiving of day shifts.
 */
export function computeStats(plan, activities) {
  if (!plan.startDate) {
    return {
      planned: {},
      actual: {},
      byWeek: (plan.weeks || []).map((w, wi) => ({
        label: w.label || `Week ${wi + 1}`,
        weekIndex: wi,
        planned: {},
        actual: {},
      })),
    }
  }

  const planStart = new Date(plan.startDate + 'T00:00:00')
  const planned = {}
  const actual = {}
  const byWeek = []

  plan.weeks.forEach((week, wi) => {
    // Week date range keys
    const wStart = new Date(planStart)
    wStart.setDate(planStart.getDate() + wi * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wStart.getDate() + 6)
    const startKey = dk(wStart)
    const endKey = dk(wEnd)

    // Planned: sum session durations by sport
    const weekPlanned = {}
    ;(week.sessions || []).forEach(s => {
      if (!s.sport || s.sport === 'Rest') return
      if (!weekPlanned[s.sport]) weekPlanned[s.sport] = { sessions: 0, durationMins: 0 }
      weekPlanned[s.sport].sessions++
      weekPlanned[s.sport].durationMins += s.duration || 0
    })

    // Actual: any Strava activity in this week's date range, matched by sport
    const weekActual = {}
    activities.forEach(a => {
      const aDate = a.start_date_local.slice(0, 10)
      if (aDate < startKey || aDate > endKey) return
      const planSport = STRAVA_TO_PLAN_SPORT[a.type]
      if (!planSport) return
      if (!weekActual[planSport]) weekActual[planSport] = { sessions: 0, durationSecs: 0, distanceM: 0 }
      weekActual[planSport].sessions++
      weekActual[planSport].durationSecs += a.moving_time || 0
      weekActual[planSport].distanceM += a.distance || 0
    })

    // Roll up to overall totals
    Object.entries(weekPlanned).forEach(([sport, v]) => {
      if (!planned[sport]) planned[sport] = { sessions: 0, durationMins: 0 }
      planned[sport].sessions += v.sessions
      planned[sport].durationMins += v.durationMins
    })
    Object.entries(weekActual).forEach(([sport, v]) => {
      if (!actual[sport]) actual[sport] = { sessions: 0, durationSecs: 0, distanceM: 0 }
      actual[sport].sessions += v.sessions
      actual[sport].durationSecs += v.durationSecs
      actual[sport].distanceM += v.distanceM
    })

    byWeek.push({
      label: week.label || `Week ${wi + 1}`,
      weekIndex: wi,
      startDate: startKey,
      endDate: endKey,
      planned: weekPlanned,
      actual: weekActual,
    })
  })

  return { planned, actual, byWeek }
}

/** Compute stats and persist to athleteStats/{uid}. Invalidates cache on write. */
export async function saveAthleteStats(uid, plan, activities) {
  const stats = computeStats(plan, activities)
  await setDoc(doc(db, 'athleteStats', uid), {
    uid,
    planId: plan.id,
    planName: plan.name,
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
  setCached(cacheKey, result, 30 * 60 * 1000) // 30 min — coaches check once a day, staleness is fine
  return result
}

/** Fetch stats for a list of uids — batched with 5-min in-memory cache per uid. */
export async function getTeamStats(memberIds) {
  return Promise.all(memberIds.map(uid => getAthleteStats(uid)))
}
