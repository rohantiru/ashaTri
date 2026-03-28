import { useState, useEffect } from 'react'
import {
  collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
  Users, Plus, X, Pencil, Trash2, CheckSquare, Square, Search, Tag, BarChart2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { getAllPlans } from '../../utils/plans'
import { getTeamStats } from '../../utils/athleteStats'
import { getCached, setCached } from '../../utils/cache'

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
              <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide sticky left-0 bg-asha-cream/50 min-w-[160px] lg:min-w-[200px]">
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
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const selectedTeam = teams.find(t => t.id === selectedTeamId)
  const selectedMembers = selectedTeam ? (selectedTeam.memberIds ?? []).map(uid => athleteMap[uid]).filter(Boolean) : []

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
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
      {/* Team list */}
      <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
        {teams.map(team => {
          const members = (team.memberIds ?? []).map(uid => athleteMap[uid]).filter(Boolean)
          return (
            <div key={team.id}>
              <div
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${selectedTeamId === team.id ? 'bg-asha-orangeDim' : 'hover:bg-asha-cream/50'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-asha-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body font-semibold text-sm text-asha-dark mb-0.5">{team.name}</div>
                  {team.description && <p className="font-body text-xs text-asha-muted">{team.description}</p>}
                  <span className="font-body text-xs text-asha-muted">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Mobile: expand chevron */}
                  <button onClick={e => toggleExpand(team.id, e)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted">
                    {expandedIds.has(team.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); onEdit(team) }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted hover:text-asha-dark">
                    <Pencil size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(team) }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {/* Mobile: member chips shown only when expanded */}
              {expandedIds.has(team.id) && (
                <div className="lg:hidden px-3.5 pt-2 pb-3 border-t border-asha-border/30">
                  {members.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
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
              )}
            </div>
          )
        })}
      </div>

      {/* Right pane: selected team detail (desktop only) */}
      {selectedTeam && (
        <div className="hidden lg:block bg-white rounded-xl border border-asha-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-asha-dark">{selectedTeam.name}</h3>
              {selectedTeam.description && <p className="font-body text-sm text-asha-muted mt-0.5">{selectedTeam.description}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(selectedTeam)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted hover:text-asha-dark" title="Edit">
                <Pencil size={14} />
              </button>
              <button onClick={() => onDelete(selectedTeam)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {selectedMembers.length > 0 ? (
            <div className="space-y-2">
              <p className="font-body text-xs text-asha-muted uppercase tracking-wide font-medium mb-3">{selectedMembers.length} {selectedMembers.length === 1 ? 'Member' : 'Members'}</p>
              {selectedMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-asha-border bg-asha-cream/30">
                  <Avatar user={m} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-medium text-sm text-asha-dark">{m.name || '—'}</div>
                    <div className="font-body text-xs text-asha-muted">{m.email}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-asha-muted">No members yet. Edit this team to add members.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Training Tab ──────────────────────────────────────────────────────────────

const SPORT_COLORS = { Run: '#FC4C02', Ride: '#16A34A', Swim: '#2563EB', Strength: '#7C3AED' }
const SPORT_LABELS = { Run: 'RUN', Ride: 'BIKE', Swim: 'SWIM', Strength: 'LIFT' }


function PctBadge({ pct }) {
  if (pct === null || pct === undefined) return null
  const cls = pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-body font-semibold px-2 py-0.5 rounded-full ${cls}`}>{pct}%</span>
}

// Determine current week index based on today vs plan start
function currentWeekIdx(planStartDate, numWeeks) {
  const today = new Date()
  const start = new Date(planStartDate + 'T00:00:00')
  const daysDiff = Math.floor((today - start) / 86400000)
  return Math.min(Math.max(Math.floor(daysDiff / 7), 0), numWeeks - 1)
}


function AthleteWeekCard({ athlete, weekData }) {
  if (!weekData) {
    return (
      <div className="px-4 py-3 flex items-center gap-3">
        {athlete.photoURL
          ? <img src={athlete.photoURL} alt={athlete.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          : <div className="w-7 h-7 rounded-full bg-asha-orangeDim flex items-center justify-center text-asha-orange font-display font-bold text-xs flex-shrink-0">{athlete.name?.[0]}</div>
        }
        <span className="font-body font-medium text-sm text-asha-dark">{athlete.name}</span>
        <span className="text-[10px] font-body text-asha-muted/60 italic ml-auto">Awaiting sync</span>
      </div>
    )
  }

  const { planned = {}, actual = {} } = weekData
  const sports = Object.keys(planned)
  const totalPlannedMins = Object.values(planned).reduce((s, p) => s + (p.durationMins || 0), 0)
  const totalActualMins = Object.values(actual).reduce((s, a) => s + (a.durationSecs || 0) / 60, 0)
  const pct = totalPlannedMins ? Math.min(100, Math.round((totalActualMins / totalPlannedMins) * 100)) : null

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      {athlete.photoURL
        ? <img src={athlete.photoURL} alt={athlete.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        : <div className="w-7 h-7 rounded-full bg-asha-orangeDim flex items-center justify-center text-asha-orange font-display font-bold text-xs flex-shrink-0">{athlete.name?.[0]}</div>
      }
      <span className="font-body font-medium text-sm text-asha-dark truncate flex-1 min-w-0">{athlete.name}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {sports.map(sport => {
          const p = planned[sport]
          const a = actual[sport]
          const plannedMins = p?.durationMins || 0
          const actualMins = Math.round((a?.durationSecs || 0) / 60)
          const hit = plannedMins > 0 && actualMins >= plannedMins * 0.8
          const partial = !hit && actualMins > 0
          return (
            <span key={sport} className="text-[10px] font-body font-bold px-1.5 py-px rounded"
              style={{
                color: SPORT_COLORS[sport],
                background: SPORT_COLORS[sport] + (hit ? '25' : partial ? '15' : '0D'),
                border: `1px solid ${SPORT_COLORS[sport]}${hit ? '50' : '28'}`,
                opacity: !hit && !partial ? 0.55 : 1,
              }}
            >
              {SPORT_LABELS[sport]} {actualMins}/{plannedMins}m
            </span>
          )
        })}
      </div>
      <PctBadge pct={pct} />
    </div>
  )
}

function TrainingTab({ teams, athletes }) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '')
  const [teamPlan, setTeamPlan] = useState(null)
  const [teamStats, setTeamStats] = useState([])
  const [planLoading, setPlanLoading] = useState(false)
  const [weekIdx, setWeekIdx] = useState(0)

  const selectedTeam = teams.find(t => t.id === selectedTeamId)
  const memberIds = selectedTeam?.memberIds || []
  const memberAthletes = memberIds.map(uid => athletes.find(a => a.id === uid)).filter(Boolean)

  useEffect(() => {
    if (!selectedTeamId) return
    setPlanLoading(true)
    setTeamPlan(null)
    setTeamStats([])
    let cancelled = false
    const cachedPlans = getCached('allPlans')
    ;(cachedPlans ? Promise.resolve(cachedPlans) : getAllPlans().then(p => { setCached('allPlans', p, 30 * 60 * 1000); return p }))
      .then(plans => {
        if (cancelled) return
        const plan = plans.find(p => p.isActive && p.teamIds?.includes(selectedTeamId))
        setTeamPlan(plan || null)
        if (plan) {
          setWeekIdx(plan.startDate ? currentWeekIdx(plan.startDate, plan.weeks.length) : 0)
          if (memberIds.length > 0) return getTeamStats(memberIds)
        }
        return []
      })
      .then(stats => { if (!cancelled) setTeamStats(stats || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPlanLoading(false) })
    return () => { cancelled = true }
  }, [selectedTeamId])

  const statsById = Object.fromEntries((teamStats || []).filter(Boolean).map(s => [s.uid, s]))
  const numWeeks = teamPlan?.weeks.length || 0

  // Sports present in this week's plan sessions
  const weekSports = teamPlan?.weeks[weekIdx]
    ? [...new Set((teamPlan.weeks[weekIdx].sessions || []).map(s => s.sport).filter(s => s && s !== 'Rest'))]
    : []

  function weekDateRange() {
    if (!teamPlan?.startDate) return null
    const start = new Date(teamPlan.startDate + 'T00:00:00')
    start.setDate(start.getDate() + weekIdx * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-asha-border p-8 text-center">
        <p className="font-body text-asha-muted text-sm">No teams yet — create one in the Teams tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Team selector + week nav in one bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {teams.map(t => (
            <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all border ${
                selectedTeamId === t.id
                  ? 'bg-asha-orange text-white border-asha-orange'
                  : 'bg-white text-asha-muted border-asha-border hover:text-asha-dark'
              }`}>
              {t.name}
            </button>
          ))}
        </div>
        {teamPlan && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setWeekIdx(i => Math.max(0, i - 1))} disabled={weekIdx === 0}
              className="p-1 rounded-lg hover:bg-asha-border disabled:opacity-25 transition-colors">
              <ChevronLeft size={14} className="text-asha-muted" />
            </button>
            <div className="text-center min-w-[150px]">
              <div className="font-body text-xs text-asha-dark font-medium leading-tight">
                {teamPlan.weeks[weekIdx]?.label || `Week ${weekIdx + 1}`}
              </div>
              {weekDateRange() && (
                <div className="font-body text-[10px] text-asha-muted leading-tight">{weekDateRange()}</div>
              )}
            </div>
            <button onClick={() => setWeekIdx(i => Math.min(numWeeks - 1, i + 1))} disabled={weekIdx === numWeeks - 1}
              className="p-1 rounded-lg hover:bg-asha-border disabled:opacity-25 transition-colors">
              <ChevronRight size={14} className="text-asha-muted" />
            </button>
          </div>
        )}
      </div>

      {planLoading ? (
        <div className="bg-white rounded-xl border border-asha-border h-32 animate-pulse" />
      ) : !teamPlan ? (
        <div className="bg-white rounded-xl border border-asha-border p-6 text-center">
          <p className="font-body text-asha-muted text-sm">No active plan for <strong>{selectedTeam?.name}</strong>.</p>
          <p className="font-body text-asha-muted text-xs mt-1">Assign a plan in Training Plans.</p>
        </div>
      ) : memberAthletes.length === 0 ? (
        <div className="bg-white rounded-xl border border-asha-border p-6 text-center">
          <p className="font-body text-asha-muted text-sm">No members in {selectedTeam?.name}.</p>
        </div>
      ) : (
        <>
          {/* Plan name + stale sync warning */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-display font-semibold text-sm text-asha-dark">{teamPlan.name}</span>
            {memberAthletes.some(a => !statsById[a.id]) && (
              <span className="text-[11px] font-body text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                ⚠ Some athletes awaiting sync
              </span>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-xl border border-asha-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-asha-cream/50 border-b border-asha-border">
                  <th className="text-left px-4 py-2.5 text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide">Athlete</th>
                  {weekSports.map(sport => (
                    <th key={sport} className="px-4 py-2.5 text-[11px] font-body font-semibold uppercase tracking-wide text-center"
                      style={{ color: SPORT_COLORS[sport] || '#8C7B6B' }}>
                      {SPORT_LABELS[sport] || sport}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-asha-border/40">
                {memberAthletes.map(athlete => {
                  const stats = statsById[athlete.id]
                  const weekData = stats?.byWeek?.[weekIdx]
                  const { planned = {}, actual = {} } = weekData || {}
                  const totalPlannedMins = Object.values(planned).reduce((s, p) => s + (p.durationMins || 0), 0)
                  const totalActualMins = Object.values(actual).reduce((s, a) => s + (a.durationSecs || 0) / 60, 0)
                  const pct = totalPlannedMins ? Math.min(100, Math.round((totalActualMins / totalPlannedMins) * 100)) : null
                  return (
                    <tr key={athlete.id} className="hover:bg-asha-cream/20 transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {athlete.photoURL
                            ? <img src={athlete.photoURL} alt={athlete.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-6 h-6 rounded-full bg-asha-orangeDim flex items-center justify-center text-asha-orange font-bold text-[10px] flex-shrink-0">{athlete.name?.[0]}</div>
                          }
                          <span className="font-body text-sm text-asha-dark">{athlete.name}</span>
                        </div>
                      </td>
                      {weekSports.map(sport => {
                        const p = planned[sport]
                        const a = actual[sport]
                        const plannedMins = p?.durationMins || 0
                        const actualMins = Math.round((a?.durationSecs || 0) / 60)
                        const barPct = plannedMins ? Math.min(100, Math.round((actualMins / plannedMins) * 100)) : 0
                        const color = SPORT_COLORS[sport] || '#8C7B6B'
                        return (
                          <td key={sport} className="px-4 py-2.5 text-center">
                            {!weekData ? (
                              <span className="text-[10px] text-asha-muted/40">—</span>
                            ) : plannedMins > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-body font-semibold tabular-nums" style={{ color, opacity: barPct >= 80 ? 1 : barPct > 0 ? 0.75 : 0.35 }}>
                                  {actualMins}<span className="font-normal text-asha-muted opacity-70">/{plannedMins}m</span>
                                </span>
                                <div className="w-14 h-1 rounded-full bg-asha-border/50 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-asha-border/80">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right">
                        {!weekData
                          ? <span className="text-[10px] text-asha-muted/50 italic">awaiting sync</span>
                          : <PctBadge pct={pct} />
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
            {memberAthletes.map(athlete => {
              const stats = statsById[athlete.id]
              const weekData = stats?.byWeek?.[weekIdx]
              return <AthleteWeekCard key={athlete.id} athlete={athlete} weekData={weekData} />
            })}
          </div>
        </>
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
    <div className="max-w-full lg:px-6 px-4 py-4 sm:py-6 overflow-x-hidden">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Athletes</h1>
        {tab === 'teams' && (
          <button onClick={() => setModal({ team: null })}
            className="flex items-center gap-1.5 bg-asha-orange text-white px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-asha-orangeLight transition-colors">
            <Plus size={14} /> New Team
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
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-10 animate-pulse" />)}</div>
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
