import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { COMPLETION_MAP } from './plans'
import { getCached, setCached, invalidate } from './cache'

const DAY_OFFSETS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

// Invert COMPLETION_MAP: Strava activity type → plan sport
const STRAVA_TO_PLAN_SPORT = {}
Object.entries(COMPLETION_MAP).forEach(([planSport, stravaTypes]) => {
  stravaTypes.forEach(t => { STRAVA_TO_PLAN_SPORT[t] = planSport })
})

/**
 * Compute planned vs actual aggregates, including per-week and per-session breakdown.
 * activities = all of the user's Strava activities (any date range — filtered internally).
 */
export function computeStats(plan, activities) {
  // Build date → activities map for fast per-session lookup
  const actByDate = {}
  activities.forEach(a => {
    const d = a.start_date_local.slice(0, 10)
    if (!actByDate[d]) actByDate[d] = []
    actByDate[d].push(a)
  })

  const planStart = new Date(plan.startDate + 'T00:00:00')

  const planned = {}
  const actual = {}
  const byWeek = []

  plan.weeks.forEach((week, wi) => {
    const weekSessions = []
    const weekPlanned = {}
    const weekActual = {}

    ;(week.sessions || []).forEach(s => {
      if (!s.sport || s.sport === 'Rest' || s.sport === 'Brick') return
      const offset = DAY_OFFSETS[s.day]
      if (offset === undefined) return

      // Compute absolute date for this session
      const d = new Date(planStart)
      d.setDate(planStart.getDate() + wi * 7 + offset)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      // Match a Strava activity on the same day with the same sport type
      const dayActs = actByDate[dateKey] || []
      const completionTypes = COMPLETION_MAP[s.sport] || []
      const matchAct = dayActs.find(a => completionTypes.includes(a.type))

      weekSessions.push({
        date: dateKey,
        day: s.day,
        sport: s.sport,
        type: s.type,
        duration: s.duration || 0,
        completed: !!matchAct,
        actualDistanceM: matchAct?.distance || 0,
        actualDurationSecs: matchAct?.moving_time || 0,
      })

      // Accumulate planned
      if (!weekPlanned[s.sport]) weekPlanned[s.sport] = { sessions: 0, durationMins: 0 }
      weekPlanned[s.sport].sessions++
      weekPlanned[s.sport].durationMins += s.duration || 0
      if (!planned[s.sport]) planned[s.sport] = { sessions: 0, durationMins: 0 }
      planned[s.sport].sessions++
      planned[s.sport].durationMins += s.duration || 0

      // Accumulate actual (only if completed)
      if (matchAct) {
        if (!weekActual[s.sport]) weekActual[s.sport] = { sessions: 0, distanceM: 0, durationSecs: 0 }
        weekActual[s.sport].sessions++
        weekActual[s.sport].distanceM += matchAct.distance || 0
        weekActual[s.sport].durationSecs += matchAct.moving_time || 0
        if (!actual[s.sport]) actual[s.sport] = { sessions: 0, distanceM: 0, durationSecs: 0 }
        actual[s.sport].sessions++
        actual[s.sport].distanceM += matchAct.distance || 0
        actual[s.sport].durationSecs += matchAct.moving_time || 0
      }
    })

    byWeek.push({
      label: week.label || `Week ${wi + 1}`,
      weekIndex: wi,
      sessions: weekSessions,
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
  invalidate(`athleteStats_${uid}`, `teamStats_${uid}`)
}

async function getAthleteStats(uid) {
  const cacheKey = `athleteStats_${uid}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached
  const snap = await getDoc(doc(db, 'athleteStats', uid))
  const result = snap.exists() ? { uid, ...snap.data() } : null
  setCached(cacheKey, result, 5 * 60 * 1000) // 5 min — refreshes when athlete syncs
  return result
}

/** Fetch stats for a list of uids — batched with 5-min in-memory cache per uid. */
export async function getTeamStats(memberIds) {
  return Promise.all(memberIds.map(uid => getAthleteStats(uid)))
}
