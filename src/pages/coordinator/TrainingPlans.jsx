import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  BookOpen, Upload, Trash2, ChevronDown, ChevronUp, Eye, EyeOff,
  AlertCircle, CheckCircle2, Loader2, X, Activity, Bike, Waves,
  Dumbbell, Zap, Calendar, Pencil,
} from 'lucide-react'
import {
  getAllPlans, uploadPlan, deletePlan, setPlanActive,
  validatePlan, PLAN_SPORTS, planEndDate, sessionCount,
  getTeams, assignPlanTeams,
} from '../../utils/plans'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_COLS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SPORT_ICONS = {
  Run: Activity, Ride: Bike, Swim: Waves, Strength: Dumbbell, Brick: Zap,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Week grid (expanded plan view) ────────────────────────────────────────────

function WeekGrid({ weeks }) {
  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="min-w-[580px]">

        {/* Column headers */}
        <div className="grid grid-cols-[100px_repeat(7,1fr)] border border-asha-border rounded-t-xl overflow-hidden">
          <div className="bg-asha-cream/70 px-3 py-2 text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide" />
          {DAY_COLS.map(d => (
            <div
              key={d}
              className="bg-asha-cream/70 px-1 py-2 text-center text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide border-l border-asha-border/50"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => {
          const byDay = {}
          ;(week.sessions || []).forEach(s => {
            if (!byDay[s.day]) byDay[s.day] = []
            byDay[s.day].push(s)
          })

          return (
            <div
              key={wi}
              className={`grid grid-cols-[100px_repeat(7,1fr)] border-x border-b border-asha-border ${wi === weeks.length - 1 ? 'rounded-b-xl overflow-hidden' : ''}`}
            >
              {/* Week label */}
              <div className="bg-asha-cream/30 px-3 py-2.5 flex flex-col justify-center">
                <div className="text-[11px] font-body font-bold text-asha-dark leading-tight">Wk {wi + 1}</div>
                {week.label && (
                  <div className="text-[9px] font-body text-asha-muted leading-tight mt-0.5 line-clamp-2">
                    {week.label.replace(/^Week\s*\d+\s*[—–\-]\s*/i, '')}
                  </div>
                )}
              </div>

              {/* Day cells */}
              {DAY_COLS.map(day => {
                const sessions = byDay[day] || []
                if (!sessions.length) {
                  return (
                    <div key={day} className="bg-white border-l border-asha-border/50 px-1 py-2 flex items-center justify-center">
                      <span className="text-asha-border/60 text-xs">—</span>
                    </div>
                  )
                }
                return (
                  <div key={day} className="bg-white border-l border-asha-border/50 px-1 py-1.5 space-y-1">
                    {sessions.map((session, si) => {
                      const sport = PLAN_SPORTS[session.sport]
                      const Icon = SPORT_ICONS[session.sport]
                      if (!sport) return null
                      return (
                        <div
                          key={si}
                          title={session.notes || ''}
                          className="flex flex-col gap-0.5 cursor-default"
                        >
                          <div className="flex items-center gap-0.5">
                            {Icon && <Icon size={9} style={{ color: sport.color, flexShrink: 0 }} />}
                            <span className="text-[10px] font-semibold leading-none truncate" style={{ color: sport.color }}>
                              {sport.label}
                            </span>
                          </div>
                          <div className="text-[9px] text-asha-muted leading-none truncate">{session.type}</div>
                          <div
                            className="text-[9px] font-semibold leading-none px-1 py-0.5 rounded inline-block w-fit"
                            style={{ background: sport.bg, color: sport.color }}
                          >
                            {session.duration}m
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ uploaderUid, onClose, onUploaded }) {
  const fileRef = useRef(null)
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState(null)
  const [parseErrors, setParseErrors] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setRaw(ev.target.result); setParsed(null); setParseErrors([]) }
    reader.readAsText(file)
  }

  function parse() {
    setParseErrors([])
    setParsed(null)
    try {
      const obj = JSON.parse(raw)
      const errs = validatePlan(obj)
      if (errs.length) { setParseErrors(errs); return }
      setParsed(obj)
    } catch (e) {
      setParseErrors([`JSON syntax error: ${e.message}`])
    }
  }

  async function upload() {
    if (!parsed) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadPlan(parsed, uploaderUid)
      onUploaded()
    } catch (e) {
      setUploadError(e.message)
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-asha-border">
          <h2 className="font-display font-bold text-lg text-asha-dark">Upload Training Plan</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-asha-cream rounded-lg transition-colors">
            <X size={16} className="text-asha-muted" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* File drop zone */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-asha-border rounded-xl py-5 flex flex-col items-center gap-2 hover:border-asha-orange hover:bg-asha-orangeDim/20 transition-colors group"
          >
            <Upload size={18} className="text-asha-muted group-hover:text-asha-orange transition-colors" />
            <span className="font-body text-sm text-asha-muted">
              Drop a <span className="font-semibold text-asha-dark">.json</span> file or click to browse
            </span>
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-asha-border" />
            <span className="text-xs text-asha-muted font-body">or paste JSON</span>
            <div className="flex-1 h-px bg-asha-border" />
          </div>

          {/* Paste textarea */}
          <textarea
            value={raw}
            onChange={e => { setRaw(e.target.value); setParsed(null); setParseErrors([]) }}
            placeholder='{ "name": "Spring Base Block", "team": "A Team", "startDate": "2026-04-07", "weeks": [...] }'
            className="w-full h-28 border border-asha-border rounded-xl px-3 py-2.5 font-mono text-xs text-asha-dark placeholder-asha-muted/40 focus:outline-none focus:ring-2 focus:ring-asha-orange/30 resize-none"
          />

          {/* Format reference */}
          <div className="bg-asha-cream rounded-xl px-4 py-3 text-xs font-body text-asha-muted space-y-1.5">
            <div className="font-semibold text-asha-dark text-[11px] uppercase tracking-wide mb-2">JSON format</div>
            <div><code className="bg-white border border-asha-border/50 px-1 rounded text-asha-dark">sport</code> → Run · Ride · Swim · Strength · Brick · Rest</div>
            <div><code className="bg-white border border-asha-border/50 px-1 rounded text-asha-dark">day</code> → Mon · Tue · Wed · Thu · Fri · Sat · Sun</div>
            <div><code className="bg-white border border-asha-border/50 px-1 rounded text-asha-dark">startDate</code> → YYYY-MM-DD (must be the Monday of week 1)</div>
            <div><code className="bg-white border border-asha-border/50 px-1 rounded text-asha-dark">duration</code> → minutes as a number</div>
            <div><code className="bg-white border border-asha-border/50 px-1 rounded text-asha-dark">notes</code> → optional session details (shown on hover)</div>
          </div>

          {/* Parse button */}
          <button
            onClick={parse}
            disabled={!raw.trim()}
            className="w-full bg-asha-mid text-white py-2.5 rounded-xl font-body font-semibold text-sm disabled:opacity-40 hover:bg-asha-dark transition-colors"
          >
            Parse & Preview
          </button>

          {/* Errors */}
          {parseErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
              {parseErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-body font-semibold text-emerald-700">Valid — ready to upload</span>
              </div>
              <div className="text-sm font-display font-bold text-asha-dark">{parsed.name}</div>
              {parsed.team && (
                <div className="flex items-center gap-1 text-xs font-body text-asha-muted">
                  <span className="px-1.5 py-0.5 rounded-full bg-asha-orangeDim text-asha-orange text-[10px] font-semibold border border-asha-orange/20">{parsed.team}</span>
                </div>
              )}
              <div className="text-xs font-body text-asha-muted">
                Starts {fmtDate(parsed.startDate)} · {parsed.weeks.length} week{parsed.weeks.length !== 1 ? 's' : ''} · {sessionCount(parsed)} sessions
              </div>
            </div>
          )}

          {uploadError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {uploadError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-asha-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-body text-sm text-asha-muted hover:text-asha-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={upload}
            disabled={!parsed || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-asha-orange text-white rounded-xl font-body font-semibold text-sm disabled:opacity-40 hover:bg-asha-orangeLight transition-colors"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload Plan
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrainingPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [toggling, setToggling] = useState({})
  const [deleting, setDeleting] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState(null)

  // Teams (for plan assignment only — management is handled elsewhere)
  const [teams, setTeams] = useState([])
  const [assigningPlanId, setAssigningPlanId] = useState(null)
  const [savingTeams, setSavingTeams] = useState(false)
  const [draftTeamIds, setDraftTeamIds] = useState([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const all = await getAllPlans()
      // Active plans first, then inactive; within each group, newest first
      all.sort((a, b) => {
        if (a.isActive !== b.isActive) return b.isActive ? 1 : -1
        return 0
      })
      setPlans(all)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    getTeams().then(setTeams).catch(() => {})
  }, [])

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleToggleActive(plan) {
    setToggling(p => ({ ...p, [plan.id]: true }))
    try {
      await setPlanActive(plan.id, !plan.isActive)
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p))
    } catch (e) {
      setError(e.message)
    }
    setToggling(p => ({ ...p, [plan.id]: false }))
  }

  async function handleDelete(plan) {
    if (!window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    setDeleting(plan.id)
    try {
      await deletePlan(plan.id)
      setPlans(prev => prev.filter(p => p.id !== plan.id))
      setExpanded(prev => { const n = new Set(prev); n.delete(plan.id); return n })
    } catch (e) {
      setError(e.message)
    }
    setDeleting(null)
  }

  function startAssignTeams(plan) {
    setAssigningPlanId(plan.id)
    setDraftTeamIds(plan.teamIds || [])
  }

  async function saveAssignTeams(planId) {
    setSavingTeams(true)
    try {
      await assignPlanTeams(planId, draftTeamIds)
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, teamIds: draftTeamIds } : p))
      setAssigningPlanId(null)
    } catch (e) { setError(e.message) }
    setSavingTeams(false)
  }

  function toggleDraftTeam(tid) {
    setDraftTeamIds(prev => prev.includes(tid) ? prev.filter(x => x !== tid) : [...prev, tid])
  }

  // ── teamName lookup helper ───────────────────────────────────────────────────
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]))

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? plans[0] ?? null

  return (
    <div className="max-w-full lg:px-6 px-4 py-4 sm:py-6">

      {/* Header */}
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
        <h1 className="font-display font-bold text-xl text-asha-dark">Training Plans</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-asha-orange text-white px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-asha-orangeLight transition-colors flex-shrink-0"
        >
          <Upload size={13} />
          Upload Plan
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-asha-muted">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-body">Loading plans…</span>
        </div>

      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-asha-border p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
            <BookOpen size={22} className="text-asha-orange" />
          </div>
          <h2 className="font-display font-semibold text-lg text-asha-dark mb-2">No plans yet</h2>
          <p className="font-body text-sm text-asha-muted mb-5">
            Upload a JSON training plan to get started.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-asha-orange text-white px-5 py-2.5 rounded-xl font-body font-semibold text-sm hover:bg-asha-orangeLight transition-colors"
          >
            <Upload size={15} />
            Upload Plan
          </button>
        </div>

      ) : (
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 lg:items-start">
          {/* Plan list */}
          <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
            {plans.map(plan => {
              const isExp = expanded.has(plan.id)
              const end = planEndDate(plan)
              const sessions = sessionCount(plan)
              const isSelected = (selectedPlanId ?? plans[0]?.id) === plan.id

              return (
                <div
                  key={plan.id}
                  className={`transition-all ${plan.isActive ? '' : 'opacity-60'}`}
                >
                  {/* Row header */}
                  <div
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-asha-orangeDim' : 'hover:bg-asha-cream/50'}`}
                  >
                    {/* Active dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${plan.isActive ? 'bg-emerald-500' : 'bg-asha-border'}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-body font-medium text-sm text-asha-dark leading-tight">{plan.name}</span>
                        {(plan.teamIds || []).map(tid => teamById[tid] && (
                          <span key={tid} className="text-[10px] font-body font-semibold px-2 py-0.5 rounded-full bg-asha-orangeDim text-asha-orange border border-asha-orange/20">
                            {teamById[tid].name}
                          </span>
                        ))}
                        {!(plan.teamIds?.length) && (
                          <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-asha-cream text-asha-muted border border-asha-border">
                            All athletes
                          </span>
                        )}
                        {!plan.isActive && (
                          <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-gray-100 text-asha-muted border border-asha-border">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-body text-asha-muted flex-wrap">
                        <Calendar size={10} />
                        {fmtDate(plan.startDate)} → {fmtDate(end)}
                        <span className="text-asha-border">·</span>
                        {plan.weeks.length} wk{plan.weeks.length !== 1 ? 's' : ''}
                        <span className="text-asha-border">·</span>
                        {sessions} session{sessions !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleActive(plan) }}
                        disabled={!!toggling[plan.id]}
                        title={plan.isActive ? 'Deactivate (hide from athletes)' : 'Activate (show to athletes)'}
                        className={`p-2 rounded-lg transition-colors ${plan.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-asha-muted hover:bg-asha-cream'}`}
                      >
                        {toggling[plan.id]
                          ? <Loader2 size={14} className="animate-spin" />
                          : plan.isActive ? <Eye size={14} /> : <EyeOff size={14} />
                        }
                      </button>
                      {/* Expand/collapse toggle (mobile only - on desktop use right pane) */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleExpand(plan.id) }}
                        className="p-2 rounded-lg text-asha-muted hover:text-asha-dark hover:bg-asha-cream transition-colors lg:hidden"
                        title={isExp ? 'Collapse' : 'View schedule'}
                      >
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(plan) }}
                        disabled={deleting === plan.id}
                        className="p-2 rounded-lg text-asha-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete plan"
                      >
                        {deleting === plan.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expanded (mobile): team assignment + week grid */}
                  {isExp && (
                    <div className="border-t border-asha-border/50 px-4 pt-4 pb-5 space-y-4 lg:hidden">
                      {/* Team assignment */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-body font-semibold text-asha-muted uppercase tracking-wide">Assigned teams</span>
                          {assigningPlanId === plan.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => setAssigningPlanId(null)} className="text-xs font-body text-asha-muted hover:text-asha-dark transition-colors">Cancel</button>
                              <button
                                onClick={() => saveAssignTeams(plan.id)}
                                disabled={savingTeams}
                                className="flex items-center gap-1 text-xs font-body font-semibold text-white bg-asha-orange px-2.5 py-1 rounded-lg hover:bg-asha-orangeLight transition-colors disabled:opacity-40"
                              >
                                {savingTeams && <Loader2 size={11} className="animate-spin" />}
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startAssignTeams(plan)}
                              className="flex items-center gap-1 text-xs font-body text-asha-muted hover:text-asha-dark transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          )}
                        </div>

                        {assigningPlanId === plan.id ? (
                          teams.length === 0 ? (
                            <p className="text-xs text-asha-muted font-body">Create a team above first.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {teams.map(t => {
                                const sel = draftTeamIds.includes(t.id)
                                return (
                                  <button
                                    key={t.id}
                                    onClick={() => toggleDraftTeam(t.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-body font-semibold border transition-colors ${sel ? 'bg-asha-orange text-white border-asha-orange' : 'bg-asha-cream text-asha-muted border-asha-border hover:border-asha-orange'}`}
                                  >
                                    {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    {t.name}
                                  </button>
                                )
                              })}
                              {draftTeamIds.length === 0 && (
                                <span className="text-xs font-body text-asha-muted italic">No teams selected = visible to all athletes</span>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(plan.teamIds || []).length === 0 ? (
                              <span className="text-xs font-body text-asha-muted italic">All athletes (no team restriction)</span>
                            ) : (plan.teamIds || []).map(tid => teamById[tid] && (
                              <span key={tid} className="px-2.5 py-1 rounded-full bg-asha-orangeDim text-asha-orange text-xs font-body font-semibold border border-asha-orange/20">
                                {teamById[tid].name} · {teamById[tid].memberIds?.length ?? 0}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <WeekGrid weeks={plan.weeks} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right pane: selected plan detail (desktop only) */}
          {selectedPlan && (
            <div className="hidden lg:block lg:bg-white lg:rounded-2xl lg:border lg:border-asha-border lg:p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-asha-dark">{selectedPlan.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-body text-asha-muted">
                    <Calendar size={10} />
                    {fmtDate(selectedPlan.startDate)} → {fmtDate(planEndDate(selectedPlan))}
                    <span className="text-asha-border">·</span>
                    {selectedPlan.weeks.length} weeks · {sessionCount(selectedPlan)} sessions
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(selectedPlan)}
                    disabled={!!toggling[selectedPlan.id]}
                    title={selectedPlan.isActive ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-lg transition-colors ${selectedPlan.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-asha-muted hover:bg-asha-cream'}`}
                  >
                    {toggling[selectedPlan.id] ? <Loader2 size={14} className="animate-spin" /> : selectedPlan.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPlan)}
                    disabled={deleting === selectedPlan.id}
                    className="p-2 rounded-lg text-asha-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    {deleting === selectedPlan.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Team assignment (desktop right pane) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-body font-semibold text-asha-muted uppercase tracking-wide">Assigned teams</span>
                  {assigningPlanId === selectedPlan.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAssigningPlanId(null)} className="text-xs font-body text-asha-muted hover:text-asha-dark transition-colors">Cancel</button>
                      <button
                        onClick={() => saveAssignTeams(selectedPlan.id)}
                        disabled={savingTeams}
                        className="flex items-center gap-1 text-xs font-body font-semibold text-white bg-asha-orange px-2.5 py-1 rounded-lg hover:bg-asha-orangeLight transition-colors disabled:opacity-40"
                      >
                        {savingTeams && <Loader2 size={11} className="animate-spin" />}
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startAssignTeams(selectedPlan)}
                      className="flex items-center gap-1 text-xs font-body text-asha-muted hover:text-asha-dark transition-colors"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                </div>
                {assigningPlanId === selectedPlan.id ? (
                  teams.length === 0 ? (
                    <p className="text-xs text-asha-muted font-body">Create a team first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {teams.map(t => {
                        const sel = draftTeamIds.includes(t.id)
                        return (
                          <button key={t.id} onClick={() => toggleDraftTeam(t.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-body font-semibold border transition-colors ${sel ? 'bg-asha-orange text-white border-asha-orange' : 'bg-asha-cream text-asha-muted border-asha-border hover:border-asha-orange'}`}>
                            {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            {t.name}
                          </button>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedPlan.teamIds || []).length === 0 ? (
                      <span className="text-xs font-body text-asha-muted italic">All athletes (no team restriction)</span>
                    ) : (selectedPlan.teamIds || []).map(tid => teamById[tid] && (
                      <span key={tid} className="px-2.5 py-1 rounded-full bg-asha-orangeDim text-asha-orange text-xs font-body font-semibold border border-asha-orange/20">
                        {teamById[tid].name} · {teamById[tid].memberIds?.length ?? 0}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <WeekGrid weeks={selectedPlan.weeks} />
            </div>
          )}
        </div>
      )}

      {showUpload && (
        <UploadModal
          uploaderUid={user?.uid}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load() }}
        />
      )}

    </div>
  )
}
