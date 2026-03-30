import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

const CACHE_KEY = 'trainingPlans_v2'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

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
  Brick:    [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function invalidate() {
  try { localStorage.removeItem(CACHE_KEY) } catch (_) {}
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function shiftDate(dateStr, days) {
  if (!dateStr || !days) return dateStr
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Plan CRUD ─────────────────────────────────────────────────────────────────

/** Fetch all plans — coordinator page. */
export async function getPlans() {
  const snap = await getDocs(collection(db, 'trainingPlans'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createPlan(name, uid) {
  const ref = await addDoc(collection(db, 'trainingPlans'), {
    name: name || 'New Plan',
    description: '',
    teamIds: [],
    activities: [],
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  invalidate()
  return ref.id
}

export async function updatePlan(id, data) {
  await updateDoc(doc(db, 'trainingPlans', id), data)
  invalidate()
}

export async function deletePlan(id) {
  await deleteDoc(doc(db, 'trainingPlans', id))
  invalidate()
}

/** Duplicate a plan, optionally shifting all activity dates by `offsetDays`. */
export async function copyPlan(srcId, newName, offsetDays, uid) {
  const snap = await getDoc(doc(db, 'trainingPlans', srcId))
  const src = snap.data()
  const activities = (src.activities || []).map(a => ({
    ...a,
    id: genId(),
    date: shiftDate(a.date, offsetDays || 0),
  }))
  const ref = await addDoc(collection(db, 'trainingPlans'), {
    name: newName,
    description: src.description || '',
    teamIds: [],
    activities,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  invalidate()
  return ref.id
}

// ── Activity CRUD ─────────────────────────────────────────────────────────────

export async function addPlanActivity(planId, activity) {
  const planSnap = await getDoc(doc(db, 'trainingPlans', planId))
  const activities = planSnap.data()?.activities || []
  const actWithId = { ...activity, id: genId() }
  await updateDoc(doc(db, 'trainingPlans', planId), {
    activities: [...activities, actWithId],
  })
  invalidate()
  return actWithId
}

export async function updatePlanActivity(planId, activityId, updates) {
  const planSnap = await getDoc(doc(db, 'trainingPlans', planId))
  const activities = (planSnap.data()?.activities || []).map(a =>
    a.id === activityId ? { ...a, ...updates } : a
  )
  await updateDoc(doc(db, 'trainingPlans', planId), { activities })
  invalidate()
}

export async function removePlanActivity(planId, activityId) {
  const planSnap = await getDoc(doc(db, 'trainingPlans', planId))
  const activities = (planSnap.data()?.activities || []).filter(a => a.id !== activityId)
  await updateDoc(doc(db, 'trainingPlans', planId), { activities })
  invalidate()
}

// ── Calendar integration ──────────────────────────────────────────────────────

/**
 * Returns a map of YYYY-MM-DD → [session, …] for the calendar.
 * Filters by user's team membership when uid is provided.
 */
export async function getActivePlanMapForUser(uid = null, forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, fetchedAt, cachedUid } = JSON.parse(raw)
        if (Date.now() - fetchedAt < CACHE_TTL_MS && cachedUid === uid) return data
      }
    } catch (_) {}
  }

  const plans = await getPlans()

  let filteredPlans = plans
  if (uid) {
    try {
      const teams = await getTeams(true)
      const userTeamIds = new Set(
        teams
          .filter(t => (t.memberIds || t.memberUids || []).includes(uid))
          .map(t => t.id)
      )
      filteredPlans = plans.filter(p =>
        !p.teamIds?.length || p.teamIds.some(tid => userTeamIds.has(tid))
      )
    } catch (e) {
      console.error('[plans] team filter failed:', e.message)
    }
  }

  const map = {}
  filteredPlans.forEach(plan => {
    ;(plan.activities || []).forEach(act => {
      if (!act.date || !act.sport) return
      if (!map[act.date]) map[act.date] = []
      map[act.date].push({ ...act, planName: plan.name, planId: plan.id })
    })
  })

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: map, fetchedAt: Date.now(), cachedUid: uid }))
  } catch (_) {}
  return map
}

// ── Bulk import ───────────────────────────────────────────────────────────────

const DAY_OFFSETS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/**
 * Detect if a parsed JSON plan uses week/day format (date-agnostic).
 * Returns true if any activity has `week` + `day` instead of `date`.
 */
export function isWeekDayFormat(parsed) {
  return (parsed.activities || []).some(a => a.week !== undefined && a.day !== undefined && !a.date)
}

/**
 * Validate and import a plan from parsed JSON.
 * If week/day format and startDate is provided, converts to explicit dates.
 * startDate must be a Monday (YYYY-MM-DD).
 */
export async function importPlan(parsed, uid, startDate = null) {
  const errors = []
  if (!parsed.name || typeof parsed.name !== 'string') errors.push('Missing "name"')
  if (!Array.isArray(parsed.activities) || parsed.activities.length === 0)
    errors.push('"activities" must be a non-empty array')
  if (errors.length) throw new Error(errors.join('; '))

  const weekDay = isWeekDayFormat(parsed)
  if (weekDay && !startDate) throw new Error('This plan uses week/day format — a start date is required.')

  const start = startDate ? new Date(startDate + 'T00:00:00') : null

  const activities = (parsed.activities || []).map(a => {
    let date = a.date
    if (weekDay) {
      const weekNum = (a.week || 1) - 1
      const dayOff = DAY_OFFSETS[a.day] ?? 0
      const d = new Date(start)
      d.setDate(start.getDate() + weekNum * 7 + dayOff)
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    return {
      id: genId(),
      date,
      sport: a.sport || 'Run',
      type: a.type || '',
      duration: a.duration ? Number(a.duration) : 0,
      distance: a.distance ? Number(a.distance) : 0,
      distanceUnit: a.distanceUnit || 'mi',
      notes: a.notes || '',
    }
  })

  const ref = await addDoc(collection(db, 'trainingPlans'), {
    name: parsed.name,
    description: parsed.description || '',
    teamIds: [],
    activities,
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  invalidate()
  return ref.id
}

// ── Teams ─────────────────────────────────────────────────────────────────────

const TEAMS_CACHE_KEY = 'trainingTeams_v1'
const TEAMS_CACHE_TTL = 5 * 60 * 1000

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
  invalidate()
}

export async function deleteTeam(id) {
  await deleteDoc(doc(db, 'teams', id))
  invalidateTeams()
  invalidate()
}
