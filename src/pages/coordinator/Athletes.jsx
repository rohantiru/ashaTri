import { useState, useEffect } from 'react'
import {
  collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
  Users, Plus, X, Pencil, Trash2, CheckSquare, Square, Search, UserPlus, Tag, BarChart2,
} from 'lucide-react'
import { getAllPlans } from '../../utils/plans'
import { getTeamStats } from '../../utils/athleteStats'

// ── Shared ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 7 }) {
  const sz = `w-${size} h-${size}`
  return user?.photoURL
    ? <img src={user.photoURL} alt={user.name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
    : <div className={`${sz} rounded-full bg-asha-orangeDim flex items-center justify-center flex-shrink-0`}><Users size={size * 1.8} className="text-asha-orange" /></div>
}

// ── Race Permissions tab (moved from RaceManagement) ─────────────────────────

function TypeBadge({ type }) {
  if (!type) return null
  const styles = { swim: 'bg-blue-50 text-blue-600', triathlon: 'bg-asha-orangeDim text-asha-orange', aquathon: 'bg-purple-50 text-purple-600' }
  const labels = { swim: 'Swim', triathlon: 'Tri', aquathon: 'Aquathon' }
  return (
    <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full ${styles[type] || 'bg-gray-100 text-gray-500'}`}>
      {labels[type] || type}
    </span>
  )
}

const STAFF_ROLES = ['coordinator', 'coach', 'owner']

function PermissionsTable({ people, races, perms, onToggle, onToggleAll }) {
  const isAllowed = (uid, raceId) => perms[uid] ? perms[uid].has(raceId) : true
  const allRaceIds = races.map(r => r.id)
  const hasAll = (uid) => allRaceIds.every(id => isAllowed(uid, id))

  return (
    <div className="bg-white rounded-2xl border border-asha-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-asha-border bg-asha-cream/50">
              <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide sticky left-0 bg-asha-cream/50 min-w-[160px]">
                Member
              </th>
              <th className="px-2 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide text-center min-w-[40px]" title="Grant/revoke all">
                All
              </th>
              {races.map(race => (
                <th key={race.id} className="px-3 py-3 text-center min-w-[90px] max-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <TypeBadge type={race.type} />
                    <span className="font-body text-xs text-asha-muted leading-tight text-center break-words">{race.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((person, i) => (
              <tr key={person.id} className={`border-b border-asha-border/40 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                <td className={`px-4 py-3 sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <div className="flex items-center gap-2">
                    <Avatar user={person} size={7} />
                    <span className="font-body font-medium text-sm text-asha-dark truncate">{person.name?.split(' ')[0] || '—'}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <button onClick={() => onToggleAll(person.id)} className="flex items-center justify-center mx-auto text-asha-muted hover:text-asha-orange transition-colors">
                    {hasAll(person.id) ? <CheckSquare size={18} className="text-asha-orange" /> : <Square size={18} />}
                  </button>
                </td>
                {races.map(race => {
                  const allowed = isAllowed(person.id, race.id)
                  return (
                    <td key={race.id} className="px-2 py-3 text-center">
                      <button onClick={() => onToggle(person.id, race.id)} className="flex items-center justify-center mx-auto transition-colors">
                        {allowed
                          ? <CheckSquare size={17} className="text-asha-orange" />
                          : <Square size={17} className="text-gray-300 hover:text-asha-muted" />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PermissionsTab({ allUsers, races, perms, onToggle, onToggleAll }) {
  const athletes = allUsers.filter(u => u.role === 'athlete')
  const staff = allUsers.filter(u => STAFF_ROLES.includes(u.role))

  if (allUsers.length === 0) return (
    <div className="text-center py-16"><Users size={32} className="text-asha-muted mx-auto mb-3" /><p className="font-body text-asha-muted">No members yet</p></div>
  )
  if (races.length === 0) return (
    <div className="text-center py-16"><p className="font-body text-asha-muted">Add races first to manage permissions</p></div>
  )

  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-asha-muted">
        Control which races each person can see and enter. Unchecking a race hides it from them.
      </p>

      {staff.length > 0 && (
        <div>
          <h3 className="font-body font-medium text-xs text-asha-muted uppercase tracking-wide mb-2">Coaches &amp; Coordinators</h3>
          <PermissionsTable people={staff} races={races} perms={perms} onToggle={onToggle} onToggleAll={onToggleAll} />
        </div>
      )}

      {athletes.length > 0 && (
        <div>
          <h3 className="font-body font-medium text-xs text-asha-muted uppercase tracking-wide mb-2">Athletes</h3>
          <PermissionsTable people={athletes} races={races} perms={perms} onToggle={onToggle} onToggleAll={onToggleAll} />
        </div>
      )}

      <p className="font-body text-xs text-asha-muted">Changes save instantly. Members without a restriction doc see all races by default.</p>
    </div>
  )
}

// ── Teams tab ─────────────────────────────────────────────────────────────────

function TeamModal({ initial, athletes, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [memberIds, setMemberIds] = useState(new Set(initial?.memberIds ?? []))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleMember = (uid) => setMemberIds(prev => {
    const next = new Set(prev)
    next.has(uid) ? next.delete(uid) : next.add(uid)
    return next
  })

  const filtered = athletes.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
  })

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description: description.trim(), memberIds: [...memberIds] })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-asha-border w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-asha-border flex-shrink-0">
          <h2 className="font-display font-bold text-asha-dark">{initial ? 'Edit Team' : 'New Team'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 flex-shrink-0">
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Team Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Advanced Group, Beginners, Open Water…"
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Description <span className="normal-case font-normal">(optional)</span></label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Notes, purpose, mailing list…"
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
            />
          </div>
        </div>

        {/* Member selector */}
        <div className="px-5 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-body font-medium text-asha-muted uppercase tracking-wide">Members</label>
            <span className="font-body text-xs text-asha-muted">{memberIds.size} selected</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-asha-muted" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter athletes…"
              className="w-full pl-8 pr-4 py-2 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1 min-h-0">
          {filtered.map(a => {
            const selected = memberIds.has(a.id)
            return (
              <button
                key={a.id}
                onClick={() => toggleMember(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${selected ? 'bg-asha-orangeDim border border-asha-orange/20' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <Avatar user={a} size={7} />
                <div className="flex-1 min-w-0">
                  <div className="font-body font-medium text-sm text-asha-dark">{a.name || '—'}</div>
                  <div className="font-body text-xs text-asha-muted">{a.email}</div>
                </div>
                {selected
                  ? <CheckSquare size={16} className="text-asha-orange flex-shrink-0" />
                  : <Square size={16} className="text-gray-300 flex-shrink-0" />}
              </button>
            )
          })}
          {filtered.length === 0 && <p className="font-body text-sm text-asha-muted text-center py-4">No members match</p>}
        </div>

        <div className="flex gap-2 p-5 border-t border-asha-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-asha-border font-body font-medium text-sm text-asha-muted hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamsTab({ athletes, teams, onAdd, onEdit, onDelete }) {
  const athleteMap = Object.fromEntries(athletes.map(a => [a.id, a]))

  if (teams.length === 0) return (
    <div className="text-center py-16">
      <Tag size={32} className="text-asha-muted mx-auto mb-3" />
      <p className="font-body text-asha-muted mb-4">No teams yet. Create one to group athletes into lists.</p>
      <button onClick={onAdd} className="flex items-center gap-2 mx-auto bg-asha-orange text-white px-4 py-2.5 rounded-xl font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors">
        <Plus size={15} /> New Team
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      {teams.map(team => {
        const members = (team.memberIds ?? []).map(uid => athleteMap[uid]).filter(Boolean)
        return (
          <div key={team.id} className="bg-white rounded-2xl border border-asha-border">
            <div className="flex items-start gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-asha-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-body font-semibold text-sm text-asha-dark mb-0.5">{team.name}</div>
                {team.description && <p className="font-body text-xs text-asha-muted mb-2">{team.description}</p>}
                {members.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 bg-asha-cream rounded-lg px-2 py-1">
                        <Avatar user={m} size={4} />
                        <span className="font-body text-xs text-asha-dark">{m.name?.split(' ')[0] || m.email}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="font-body text-xs text-asha-muted">No members yet</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="font-body text-xs text-asha-muted mr-1">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                <button onClick={() => onEdit(team)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted hover:text-asha-dark">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(team)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Training Tab ──────────────────────────────────────────────────────────────

const SPORT_COLORS = { Run: '#FC4C02', Ride: '#16A34A', Swim: '#2563EB', Strength: '#7C3AED', Brick: '#D97706' }

function fmtMins(mins) {
  const h = Math.floor(mins / 60); const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}
function fmtSecs(secs) {
  const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}
function fmtDist(distM, sport) {
  if (!distM) return null
  if (sport === 'Swim') return `${Math.round(distM * 1.09361)} yd`
  return `${(distM / 1609.34).toFixed(1)} mi`
}
function PctBadge({ pct }) {
  if (pct === null || pct === undefined) return null
  const cls = pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-body font-semibold px-2 py-0.5 rounded-full ${cls}`}>{pct}%</span>
}

function TrainingTab({ teams, athletes }) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '')
  const [teamPlan, setTeamPlan] = useState(null)
  const [teamStats, setTeamStats] = useState([])
  const [planLoading, setPlanLoading] = useState(false)

  const selectedTeam = teams.find(t => t.id === selectedTeamId)
  const memberIds = selectedTeam?.memberIds || []
  const memberAthletes = memberIds.map(uid => athletes.find(a => a.id === uid)).filter(Boolean)

  useEffect(() => {
    if (!selectedTeamId) return
    setPlanLoading(true)
    setTeamPlan(null)
    setTeamStats([])
    let cancelled = false
    getAllPlans()
      .then(plans => {
        if (cancelled) return
        const plan = plans.find(p => p.isActive && p.teamIds?.includes(selectedTeamId))
        setTeamPlan(plan || null)
        if (plan && memberIds.length > 0) return getTeamStats(memberIds)
        return []
      })
      .then(stats => { if (!cancelled) setTeamStats(stats || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPlanLoading(false) })
    return () => { cancelled = true }
  }, [selectedTeamId])

  const allSports = teamPlan
    ? [...new Set(teamPlan.weeks.flatMap(w => (w.sessions || []).map(s => s.sport)).filter(s => s && s !== 'Rest'))]
    : []

  const statsById = Object.fromEntries((teamStats || []).filter(Boolean).map(s => [s.uid, s]))

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-asha-border p-8 text-center">
        <p className="font-body text-asha-muted text-sm">No teams yet — create one in the Teams tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team selector */}
      <div className="flex gap-2 flex-wrap">
        {teams.map(t => (
          <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all border ${
              selectedTeamId === t.id
                ? 'bg-asha-orange text-white border-asha-orange'
                : 'bg-white text-asha-muted border-asha-border hover:text-asha-dark'
            }`}>
            {t.name}
          </button>
        ))}
      </div>

      {planLoading ? (
        <div className="bg-white rounded-2xl border border-asha-border h-40 animate-pulse" />
      ) : !teamPlan ? (
        <div className="bg-white rounded-2xl border border-asha-border p-8 text-center">
          <p className="font-body text-asha-muted text-sm">No active plan assigned to <strong>{selectedTeam?.name}</strong>.</p>
          <p className="font-body text-asha-muted text-xs mt-1">Assign a plan to this team in Training Plans.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-asha-border overflow-hidden">
          <div className="px-5 py-3 border-b border-asha-border bg-asha-cream/50 flex items-center justify-between flex-wrap gap-2">
            <span className="font-display font-semibold text-sm text-asha-dark">{teamPlan.name}</span>
            <span className="font-body text-xs text-asha-muted">{teamPlan.weeks.length} weeks · starts {teamPlan.startDate}</span>
          </div>

          {memberAthletes.length === 0 ? (
            <div className="p-6 text-center">
              <p className="font-body text-asha-muted text-sm">No members in this team.</p>
            </div>
          ) : (
            <div className="divide-y divide-asha-border">
              {memberAthletes.map(athlete => {
                const stats = statsById[athlete.id]
                return (
                  <div key={athlete.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {athlete.photoURL
                        ? <img src={athlete.photoURL} alt={athlete.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-asha-orangeDim flex items-center justify-center text-asha-orange font-display font-bold text-xs flex-shrink-0">{athlete.name?.[0]}</div>
                      }
                      <span className="font-body font-medium text-sm text-asha-dark">{athlete.name}</span>
                      {!stats && <span className="text-xs font-body text-asha-muted italic">No data yet — athlete needs to open their Training tab</span>}
                    </div>
                    {stats && allSports.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {allSports.map(sport => {
                          const p = stats.planned?.[sport]
                          const a = stats.actual?.[sport]
                          if (!p && !a) return null
                          const pct = p?.sessions ? Math.min(100, Math.round(((a?.sessions || 0) / p.sessions) * 100)) : null
                          const dist = fmtDist(a?.distanceM, sport)
                          return (
                            <div key={sport} className="rounded-xl border border-asha-border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-body font-semibold" style={{ color: SPORT_COLORS[sport] }}>{sport}</span>
                                <PctBadge pct={pct} />
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-body text-asha-muted">
                                  Plan: <span className="text-asha-dark font-medium">{p ? `${p.sessions} × ${fmtMins(p.durationMins)}` : '—'}</span>
                                </div>
                                <div className="text-xs font-body text-asha-muted">
                                  Done: <span className="text-asha-dark font-medium">
                                    {a ? [a.sessions + ' sessions', dist, fmtSecs(a.durationSecs)].filter(Boolean).join(' · ') : '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AthletesPage() {
  const [tab, setTab] = useState('teams')
  const [athletes, setAthletes] = useState([])
  const [races, setRaces] = useState([])
  const [perms, setPerms] = useState({})
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { team: object|null }

  const load = async () => {
    const [usersSnap, racesSnap, permsSnap, teamsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'races')),
      getDocs(collection(db, 'racePermissions')),
      getDocs(collection(db, 'teams')),
    ])

    const athletesList = usersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.role !== 'serviceUser')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    setAthletes(athletesList)

    const racesList = racesSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date > b.date ? 1 : -1
      })
    setRaces(racesList)

    const permsMap = {}
    permsSnap.docs.forEach(d => { permsMap[d.id] = new Set(d.data().allowedRaceIds || []) })
    setPerms(permsMap)

    const teamsList = teamsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    setTeams(teamsList)

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Race permission handlers ──
  const togglePerm = async (uid, raceId) => {
    const current = perms[uid] ?? new Set(races.map(r => r.id))
    const next = new Set(current)
    next.has(raceId) ? next.delete(raceId) : next.add(raceId)
    setPerms(p => ({ ...p, [uid]: next }))
    await setDoc(doc(db, 'racePermissions', uid), { allowedRaceIds: [...next] })
  }

  const toggleAllPerms = async (uid) => {
    const allIds = races.map(r => r.id)
    const current = perms[uid] ?? new Set(allIds)
    const hasAll = allIds.every(id => current.has(id))
    const next = new Set(hasAll ? [] : allIds)
    setPerms(p => ({ ...p, [uid]: next }))
    await setDoc(doc(db, 'racePermissions', uid), { allowedRaceIds: [...next] })
  }

  // ── Team handlers ──
  const saveTeam = async ({ name, description, memberIds }) => {
    if (modal?.team) {
      await updateDoc(doc(db, 'teams', modal.team.id), { name, description, memberIds, updatedAt: serverTimestamp() })
      setTeams(prev => prev.map(t => t.id === modal.team.id ? { ...t, name, description, memberIds } : t))
    } else {
      const ref = await addDoc(collection(db, 'teams'), { name, description, memberIds, createdAt: serverTimestamp() })
      setTeams(prev => [...prev, { id: ref.id, name, description, memberIds }].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setModal(null)
  }

  const deleteTeam = async (team) => {
    if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return
    await deleteDoc(doc(db, 'teams', team.id))
    setTeams(prev => prev.filter(t => t.id !== team.id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-asha-dark">Athletes</h1>
          <p className="font-body text-asha-muted text-sm mt-1">Manage athlete groups and race access</p>
        </div>
        {tab === 'teams' && (
          <button onClick={() => setModal({ team: null })}
            className="flex items-center gap-2 bg-asha-orange text-white px-4 py-2.5 rounded-xl font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors">
            <Plus size={16} /> New Team
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-asha-cream rounded-xl p-1 w-fit overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[['teams', Tag, 'Teams'], ['training', BarChart2, 'Training'], ['permissions', CheckSquare, 'Race Permissions']].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all whitespace-nowrap ${tab === key ? 'bg-white text-asha-dark shadow-sm' : 'text-asha-muted hover:text-asha-dark'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-20 animate-pulse" />)}</div>
      ) : tab === 'teams' ? (
        <TeamsTab
          athletes={athletes}
          teams={teams}
          onAdd={() => setModal({ team: null })}
          onEdit={(team) => setModal({ team })}
          onDelete={deleteTeam}
        />
      ) : tab === 'training' ? (
        <TrainingTab athletes={athletes} teams={teams} />
      ) : (
        <PermissionsTab
          allUsers={athletes}
          races={races}
          perms={perms}
          onToggle={togglePerm}
          onToggleAll={toggleAllPerms}
        />
      )}

      {modal && (
        <TeamModal
          initial={modal.team}
          athletes={athletes}
          onSave={saveTeam}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
