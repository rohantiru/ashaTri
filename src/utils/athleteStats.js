import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { COMPLETION_MAP } from './plans'

// Invert COMPLETION_MAP: Strava activity type → plan sport
const STRAVA_TO_PLAN_SPORT = {}
Object.entries(COMPLETION_MAP).forEach(([planSport, stravaTypes]) => {
  stravaTypes.forEach(t => { STRAVA_TO_PLAN_SPORT[t] = planSport })
})

/**
 * Compute planned vs actual aggregates.
 * activities = all of the user's Strava activities (any date range — we filter internally).
 */
export function computeStats(plan, activities) {
  // Planned: sessions + total duration per sport
  const planned = {}
  plan.weeks.forEach(week => {
    ;(week.sessions || []).forEach(s => {
      if (!s.sport || s.sport === 'Rest') return
      if (!planned[s.sport]) planned[s.sport] = { sessions: 0, durationMins: 0 }
      planned[s.sport].sessions++
      planned[s.sport].durationMins += s.duration || 0
    })
  })

  // Plan date range
  const planStart = new Date(plan.startDate + 'T00:00:00')
  const planEnd = new Date(planStart)
  planEnd.setDate(planStart.getDate() + plan.weeks.length * 7)

  // Actual: filter to plan window, group by mapped sport
  const actual = {}
  activities.forEach(a => {
    const actDate = new Date(a.start_date_local)
    if (actDate < planStart || actDate >= planEnd) return
    const planSport = STRAVA_TO_PLAN_SPORT[a.type]
    if (!planSport) return
    if (!actual[planSport]) actual[planSport] = { sessions: 0, distanceM: 0, durationSecs: 0 }
    actual[planSport].sessions++
    actual[planSport].distanceM += a.distance || 0
    actual[planSport].durationSecs += a.moving_time || 0
  })

  return { planned, actual }
}

/** Compute stats and persist to athleteStats/{uid}. */
export async function saveAthleteStats(uid, plan, activities) {
  const { planned, actual } = computeStats(plan, activities)
  await setDoc(doc(db, 'athleteStats', uid), {
    uid,
    planId: plan.id,
    planName: plan.name,
    planned,
    actual,
    updatedAt: serverTimestamp(),
  })
}

export async function getAthleteStats(uid) {
  const snap = await getDoc(doc(db, 'athleteStats', uid))
  return snap.exists() ? { uid, ...snap.data() } : null
}

export async function getTeamStats(memberIds) {
  return Promise.all(memberIds.map(uid => getAthleteStats(uid)))
}
