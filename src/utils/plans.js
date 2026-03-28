import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const CACHE_KEY = 'trainingPlans_v1'
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

// ── Sport config ──────────────────────────────────────────────────────────────

export const PLAN_SPORTS = {
  Run:      { color: '#FC4C02', bg: '#FFF3EE', label: 'Run'   },
  Ride:     { color: '#16A34A', bg: '#F0FDF4', label: 'Bike'  },
  Swim:     { color: '#2563EB', bg: '#EFF6FF', label: 'Swim'  },
  Strength: { color: '#7C3AED', bg: '#F5F3FF', label: 'Lift'  },
  Brick:    { color: '#D97706', bg: '#FFFBEB', label: 'Brick' },
}

// Maps plan sport → Strava activity types that count as completion
export const COMPLETION_MAP = {
  Run:      ['Run', 'TrailRun', 'VirtualRun'],
  Ride:     ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide'],
  Swim:     ['Swim', 'OpenWaterSwim'],
  Strength: ['WeightTraining', 'Workout', 'Crossfit'],
  Brick:    [], // needs both bike + run; skip auto-complete for v1
}

// ── Firestore ─────────────────────────────────────────────────────────────────

function invalidate() {
  try { localStorage.removeItem(CACHE_KEY) } catch (_) {}
}

/**
 * Fetch active plans for the athlete calendar — with 12h localStorage cache.
 * Pass userUid to filter by team membership; null/undefined = return all (owner mode).
 */
export async function getActivePlans(userUid = null, forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, fetchedAt } = JSON.parse(raw)
        if (Date.now() - fetchedAt < CACHE_TTL_MS) {
          return userUid ? filterByUser(data, userUid) : data
        }
      }
    } catch (_) {}
  }
  const snap = await getDocs(collection(db, 'trainingPlans'))
  const active = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.isActive)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: active, fetchedAt: Date.now() }))
  } catch (_) {}
  return userUid ? filterByUser(active, userUid) : active
}

async function filterByUser(plans, userUid) {
  const teams = await getTeams() // cached 5 min
  const userTeamIds = new Set(teams.filter(t => t.memberIds?.includes(userUid)).map(t => t.id))
  return plans.filter(p =>
    !p.teamIds?.length || // no team restriction → visible to all
    p.teamIds.some(tid => userTeamIds.has(tid))
  )
}

/** Fetch all plans (no cache) for the coordinator management page. */
export async function getAllPlans() {
  const snap = await getDocs(collection(db, 'trainingPlans'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function uploadPlan(planData, uploaderUid) {
  // Strip any id/meta fields and startDate (start date is set post-upload via setPlanStartDate)
  const { id: _id, createdAt: _ca, uploadedBy: _ub, isActive: _ia, startDate: _sd, ...clean } = planData
  const ref = await addDoc(collection(db, 'trainingPlans'), {
    ...clean,
    isActive: true,
    createdAt: serverTimestamp(),
    uploadedBy: uploaderUid,
  })
  invalidate()
  return ref.id
}

export async function setPlanStartDate(id, startDate) {
  await updateDoc(doc(db, 'trainingPlans', id), { startDate })
  invalidate()
}

export async function deletePlan(id) {
  await deleteDoc(doc(db, 'trainingPlans', id))
  invalidate()
}

export async function setPlanActive(id, isActive) {
  await updateDoc(doc(db, 'trainingPlans', id), { isActive })
  invalidate()
}

// ── Date mapping ──────────────────────────────────────────────────────────────

const DAY_OFFSETS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/**
 * Given a plan, return a map of `YYYY-MM-DD` → [session, …].
 * startDate is the Monday of week 1. Pass startDateOverride to use a different date.
 * Returns {} if no start date is available.
 */
export function buildPlanDateMap(plan, startDateOverride) {
  const sd = startDateOverride ?? plan.startDate
  if (!sd) return {}
  const map = {}
  const start = new Date(sd + 'T00:00:00')

  plan.weeks.forEach((week, wi) => {
    ;(week.sessions || []).forEach(session => {
      if (!session.sport || session.sport === 'Rest') return
      const offset = DAY_OFFSETS[session.day]
      if (offset === undefined) return

      const d = new Date(start)
      d.setDate(start.getDate() + wi * 7 + offset)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      if (!map[key]) map[key] = []
      map[key].push({ ...session, planName: plan.name, planId: plan.id })
    })
  })
  return map
}

/** Merge multiple per-plan date maps into one combined map. */
export function mergePlanMaps(maps) {
  const merged = {}
  maps.forEach(m => {
    Object.entries(m).forEach(([key, sessions]) => {
      if (!merged[key]) merged[key] = []
      merged[key].push(...sessions)
    })
  })
  return merged
}

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_SPORTS = [...Object.keys(PLAN_SPORTS), 'Rest']
const VALID_DAYS   = Object.keys(DAY_OFFSETS)

export function validatePlan(obj) {
  const errors = []

  if (!obj.name || typeof obj.name !== 'string')
    errors.push('Missing or invalid "name" (must be a non-empty string)')
  if (obj.startDate)
    errors.push('"startDate" is no longer part of the plan format — remove it from your JSON. Set the start date after uploading using the calendar picker.')
  if (!Array.isArray(obj.weeks) || obj.weeks.length === 0)
    errors.push('"weeks" must be a non-empty array')

  obj.weeks?.forEach((week, wi) => {
    if (!Array.isArray(week.sessions)) {
      errors.push(`Week ${wi + 1}: "sessions" must be an array`)
      return
    }
    week.sessions.forEach((s, si) => {
      const loc = `Week ${wi + 1}, session ${si + 1}`
      if (!VALID_DAYS.includes(s.day))
        errors.push(`${loc}: invalid "day" "${s.day}" — must be Mon/Tue/Wed/Thu/Fri/Sat/Sun`)
      if (!VALID_SPORTS.includes(s.sport))
        errors.push(`${loc}: invalid "sport" "${s.sport}" — must be Run/Ride/Swim/Strength/Brick/Rest`)
      if (typeof s.duration !== 'number')
        errors.push(`${loc}: "duration" must be a number (minutes)`)
      if (!s.type || typeof s.type !== 'string')
        errors.push(`${loc}: "type" must be a non-empty string (e.g. "Easy", "Tempo")`)
    })
  })

  return errors
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function planEndDate(plan) {
  if (!plan.startDate) return null
  const d = new Date(plan.startDate + 'T00:00:00')
  d.setDate(d.getDate() + plan.weeks.length * 7 - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function sessionCount(plan) {
  return plan.weeks.reduce(
    (sum, w) => sum + (w.sessions?.filter(s => s.sport !== 'Rest').length ?? 0),
    0,
  )
}

// ── Teams ─────────────────────────────────────────────────────────────────────

const TEAMS_CACHE_KEY = 'trainingTeams_v1'
const TEAMS_CACHE_TTL = 5 * 60 * 1000 // 5 min

function invalidateTeams() {
  try { localStorage.removeItem(TEAMS_CACHE_KEY) } catch (_) {}
}

export async function getTeams(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(TEAMS_CACHE_KEY)
      if (raw) {
        const { data, fetchedAt } = JSON.parse(raw)
        if (Date.now() - fetchedAt < TEAMS_CACHE_TTL) return data
      }
    } catch (_) {}
  }
  const snap = await getDocs(collection(db, 'teams'))
  const teams = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  teams.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  try {
    localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify({ data: teams, fetchedAt: Date.now() }))
  } catch (_) {}
  return teams
}

export async function createTeam(name, createdBy) {
  const ref = await addDoc(collection(db, 'teams'), {
    name,
    memberUids: [],
    createdAt: serverTimestamp(),
    createdBy,
  })
  invalidateTeams()
  return ref.id
}

export async function updateTeam(id, data) {
  await updateDoc(doc(db, 'teams', id), data)
  invalidateTeams()
  invalidate() // plans cache references teams
}

export async function deleteTeam(id) {
  await deleteDoc(doc(db, 'teams', id))
  invalidateTeams()
  invalidate()
}

export async function assignPlanTeams(planId, teamIds) {
  await updateDoc(doc(db, 'trainingPlans', planId), { teamIds })
  invalidate()
}

/**
 * Given a user uid, return the team IDs they belong to.
 * Fetches all teams (cached 5 min) and filters client-side — teams list is small.
 */
export async function getUserTeamIds(uid) {
  const teams = await getTeams()
  return teams.filter(t => t.memberIds?.includes(uid)).map(t => t.id)
}
