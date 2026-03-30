import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, Trash2, Pencil, Copy, ChevronDown, ChevronUp, X,
  Activity, Bike, Waves, Zap, Timer, Loader2, AlertCircle, Check, Upload,
} from 'lucide-react'
import {
  getPlans, createPlan, updatePlan, deletePlan, copyPlan,
  addPlanActivity, updatePlanActivity, removePlanActivity,
  getTeams, PLAN_SPORTS, importPlan, isWeekDayFormat,
} from '../../utils/plans'

// ── Constants ─────────────────────────────────────────────────────────────────

const SPORT_ICONS = {
  Run: Activity, Ride: Bike, Swim: Waves, Strength: Zap, Brick: Timer,
}

const SPORT_OPTS = Object.entries(PLAN_SPORTS).map(([k, v]) => ({ value: k, label: v.label }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(str) {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Activity form ─────────────────────────────────────────────────────────────

const BLANK_ACT = { date: today(), sport: 'Run', type: '', duration: '', distance: '', distanceUnit: 'mi', notes: '' }

function ActivityForm({ initial = BLANK_ACT, saving, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.date && form.sport && form.type.trim()

  return (
    <div className="bg-asha-cream/60 border border-asha-border rounded-xl p-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
          />
        </div>
        <div>
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Sport</label>
          <select
            value={form.sport}
            onChange={e => set('sport', e.target.value)}
            className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
          >
            {SPORT_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Type / Label</label>
          <input
            type="text"
            placeholder="e.g. Easy, Tempo, Long"
            value={form.type}
            onChange={e => set('type', e.target.value)}
            className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
          />
        </div>
        <div>
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Duration (min)</label>
          <input
            type="number"
            min="0"
            placeholder="45"
            value={form.duration}
            onChange={e => set('duration', e.target.value)}
            className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Distance (optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="3.1"
            value={form.distance}
            onChange={e => set('distance', e.target.value)}
            className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
          />
        </div>
        <div>
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Unit</label>
          <select
            value={form.distanceUnit}
            onChange={e => set('distanceUnit', e.target.value)}
            className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
          >
            <option value="mi">mi</option>
            <option value="km">km</option>
            <option value="yd">yd</option>
            <option value="m">m</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Notes (optional)</label>
        <input
          type="text"
          placeholder="Any extra details"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full text-sm font-body px-2.5 py-1.5 border border-asha-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-asha-orange"
        />
      </div>

      <div className="flex gap-2 pt-0.5">
        <button
          disabled={!valid || saving}
          onClick={() => onSave({ ...form, duration: form.duration ? Number(form.duration) : 0, distance: form.distance ? Number(form.distance) : 0 })}
          className="flex-1 flex items-center justify-center gap-1.5 bg-asha-orange text-white text-sm font-body font-semibold rounded-lg py-1.5 disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-body text-asha-muted border border-asha-border rounded-lg hover:bg-asha-cream transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ act, planId, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const sport = PLAN_SPORTS[act.sport] || { color: '#9CA3AF', bg: '#F9FAFB', label: act.sport }
  const Icon = SPORT_ICONS[act.sport] || Activity

  async function handleSave(data) {
    setSaving(true)
    try {
      await updatePlanActivity(planId, act.id, data)
      onUpdated({ ...act, ...data })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove this ${act.sport} session on ${fmtShortDate(act.date)}?`)) return
    await removePlanActivity(planId, act.id)
    onDeleted(act.id)
  }

  if (editing) {
    return (
      <div className="px-4 py-3">
        <ActivityForm
          initial={{ date: act.date, sport: act.sport, type: act.type || '', duration: act.duration || '', distance: act.distance || '', distanceUnit: act.distanceUnit || 'mi', notes: act.notes || '' }}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-asha-cream/40 transition-colors">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: sport.bg }}
      >
        <Icon size={14} style={{ color: sport.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-body font-semibold text-asha-dark">{act.type || sport.label}</span>
          {act.distance > 0 && (
            <span className="text-[11px] font-body text-asha-muted">{act.distance} {act.distanceUnit || 'mi'}</span>
          )}
          {act.duration > 0 && (
            <span className="text-[11px] font-body text-asha-muted">{act.duration}m</span>
          )}
        </div>
        <div className="text-[11px] font-body text-asha-muted">{fmtDate(act.date)}</div>
        {act.notes && (
          <div className="text-[11px] font-body text-asha-muted/70 truncate">{act.notes}</div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-asha-border/40 transition-colors"
          title="Edit"
        >
          <Pencil size={12} className="text-asha-muted" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={12} className="text-red-400" />
        </button>
      </div>
    </div>
  )
}

// ── Copy plan modal ────────────────────────────────────────────────────────────

function CopyModal({ plan, uid, onDone, onClose }) {
  const [name, setName] = useState(`${plan.name} (copy)`)
  const [offsetDays, setOffsetDays] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCopy() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const newId = await copyPlan(plan.id, name.trim(), offsetDays ? parseInt(offsetDays, 10) : 0, uid)
      onDone(newId)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-asha-border w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-asha-border">
          <h3 className="font-display font-bold text-asha-dark">Copy Plan</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-asha-cream transition-colors">
            <X size={16} className="text-asha-muted" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">New Plan Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-sm font-body px-3 py-2 border border-asha-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-asha-orange/40"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">
              Shift Dates By (days)
            </label>
            <input
              type="number"
              placeholder="0 — keep same dates"
              value={offsetDays}
              onChange={e => setOffsetDays(e.target.value)}
              className="w-full text-sm font-body px-3 py-2 border border-asha-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-asha-orange/40"
            />
            <p className="text-[11px] font-body text-asha-muted mt-1">E.g. 7 to shift all activities one week forward.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2 p-5 border-t border-asha-border">
          <button
            disabled={!name.trim() || saving}
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-asha-orange text-white text-sm font-body font-semibold rounded-xl py-2.5 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Copy
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-body text-asha-muted border border-asha-border rounded-xl hover:bg-asha-cream transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Plan detail ───────────────────────────────────────────────────────────────

function PlanDetail({ plan, teams, onUpdated, onDeleted, onCopied }) {
  const { user } = useAuth()
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(plan.name)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descVal, setDescVal] = useState(plan.description || '')
  const [activities, setActivities] = useState(
    [...(plan.activities || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  )
  const [adding, setAdding] = useState(false)
  const [savingAdd, setSavingAdd] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [savingTeams, setSavingTeams] = useState(false)
  const [teamIds, setTeamIds] = useState(plan.teamIds || [])
  const [deletingPlan, setDeletingPlan] = useState(false)

  // Sync when plan prop changes (e.g. after copy refreshes list and selects new plan)
  useEffect(() => {
    setNameVal(plan.name)
    setDescVal(plan.description || '')
    setTeamIds(plan.teamIds || [])
    setActivities([...(plan.activities || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '')))
  }, [plan.id])

  async function saveName() {
    if (!nameVal.trim() || nameVal === plan.name) { setEditingName(false); return }
    await updatePlan(plan.id, { name: nameVal.trim() })
    onUpdated({ ...plan, name: nameVal.trim() })
    setEditingName(false)
  }

  async function saveDesc() {
    if (descVal === (plan.description || '')) { setEditingDesc(false); return }
    await updatePlan(plan.id, { description: descVal })
    onUpdated({ ...plan, description: descVal })
    setEditingDesc(false)
  }

  async function toggleTeam(teamId) {
    const next = teamIds.includes(teamId)
      ? teamIds.filter(t => t !== teamId)
      : [...teamIds, teamId]
    setTeamIds(next)
    setSavingTeams(true)
    try {
      await updatePlan(plan.id, { teamIds: next })
      onUpdated({ ...plan, teamIds: next })
    } finally {
      setSavingTeams(false)
    }
  }

  async function handleAddActivity(data) {
    setSavingAdd(true)
    try {
      const act = await addPlanActivity(plan.id, data)
      const next = [...activities, act].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      setActivities(next)
      onUpdated({ ...plan, activities: next })
      setAdding(false)
    } finally {
      setSavingAdd(false)
    }
  }

  function handleActivityUpdated(updated) {
    const next = activities.map(a => a.id === updated.id ? updated : a)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    setActivities(next)
    onUpdated({ ...plan, activities: next })
  }

  function handleActivityDeleted(id) {
    const next = activities.filter(a => a.id !== id)
    setActivities(next)
    onUpdated({ ...plan, activities: next })
  }

  async function handleDeletePlan() {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    setDeletingPlan(true)
    try {
      await deletePlan(plan.id)
      onDeleted(plan.id)
    } finally {
      setDeletingPlan(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-asha-border">
        {/* Name */}
        {editingName ? (
          <div className="flex items-center gap-2 mb-1">
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="flex-1 font-display font-bold text-xl text-asha-dark bg-transparent border-b-2 border-asha-orange focus:outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="group flex items-center gap-1.5 mb-1"
          >
            <h2 className="font-display font-bold text-xl text-asha-dark">{plan.name}</h2>
            <Pencil size={13} className="text-asha-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Description */}
        {editingDesc ? (
          <textarea
            autoFocus
            rows={2}
            value={descVal}
            onChange={e => setDescVal(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false) }}
            placeholder="Add a description…"
            className="w-full text-sm font-body text-asha-muted bg-transparent border-b border-asha-border focus:outline-none resize-none"
          />
        ) : (
          <button
            onClick={() => setEditingDesc(true)}
            className="group flex items-start gap-1 text-left"
          >
            <p className="text-sm font-body text-asha-muted">
              {plan.description || <span className="italic text-asha-border">Add description…</span>}
            </p>
            <Pencil size={11} className="text-asha-muted mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setShowCopy(true)}
            className="flex items-center gap-1.5 text-xs font-body text-asha-muted border border-asha-border rounded-lg px-3 py-1.5 hover:bg-asha-cream transition-colors"
          >
            <Copy size={12} />
            Copy Plan
          </button>
          <button
            onClick={handleDeletePlan}
            disabled={deletingPlan}
            className="flex items-center gap-1.5 text-xs font-body text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            {deletingPlan ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete
          </button>
        </div>
      </div>

      {/* Teams */}
      <div className="px-5 py-3 border-b border-asha-border">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide">Assign to Teams</span>
          {savingTeams && <Loader2 size={10} className="animate-spin text-asha-muted" />}
        </div>
        {teams.length === 0 ? (
          <p className="text-xs font-body text-asha-muted italic">No teams created yet — create teams in the Athletes tab.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teams.map(t => {
              const on = teamIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTeam(t.id)}
                  className={`text-xs font-body font-semibold rounded-full px-3 py-1 border transition-colors ${
                    on
                      ? 'bg-asha-orange text-white border-asha-orange'
                      : 'bg-white text-asha-muted border-asha-border hover:border-asha-orange/50'
                  }`}
                >
                  {t.name}
                </button>
              )
            })}
          </div>
        )}
        {teamIds.length === 0 && (
          <p className="text-[11px] font-body text-asha-muted mt-1.5">No team assigned — visible to all athletes.</p>
        )}
      </div>

      {/* Activities */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide">
            Activities ({activities.length})
          </span>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-xs font-body font-semibold text-asha-orange hover:underline"
            >
              <Plus size={12} />
              Add
            </button>
          )}
        </div>

        {adding && (
          <div className="px-4 pb-3">
            <ActivityForm
              saving={savingAdd}
              onSave={handleAddActivity}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {activities.length === 0 && !adding && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-body text-asha-muted">No activities yet.</p>
            <p className="text-xs font-body text-asha-muted/70 mt-0.5">Add target sessions to build this plan.</p>
          </div>
        )}

        <div className="divide-y divide-asha-border/40">
          {activities.map(act => (
            <ActivityRow
              key={act.id}
              act={act}
              planId={plan.id}
              onUpdated={handleActivityUpdated}
              onDeleted={handleActivityDeleted}
            />
          ))}
        </div>
      </div>

      {showCopy && (
        <CopyModal
          plan={plan}
          uid={user.uid}
          onDone={newId => { setShowCopy(false); onCopied(newId) }}
          onClose={() => setShowCopy(false)}
        />
      )}
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function snapMonday(dateStr) {
  if (!dateStr) return dateStr
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (dow !== 1) d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function UploadModal({ uid, onDone, onClose }) {
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [needsDate, setNeedsDate] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [importError, setImportError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target.result)
        setParsed(obj)
        setParseError(null)
        setNeedsDate(isWeekDayFormat(obj))
        // Default start date to next Monday
        const nextMon = snapMonday(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
        setStartDate(nextMon)
      } catch {
        setParsed(null)
        setParseError('Invalid JSON — check the file format.')
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!parsed) return
    setSaving(true)
    setImportError(null)
    try {
      const sd = needsDate ? startDate : null
      const newId = await importPlan(parsed, uid, sd)
      onDone(newId)
    } catch (e) {
      setImportError(e.message)
      setSaving(false)
    }
  }

  const actCount = parsed?.activities?.length || 0
  const canImport = parsed && (!needsDate || startDate)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-asha-border w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-asha-border">
          <h3 className="font-display font-bold text-asha-dark">Upload Plan JSON</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-asha-cream transition-colors">
            <X size={16} className="text-asha-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* File picker */}
          <div>
            <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1.5">
              JSON File
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFile}
              className="w-full text-sm font-body text-asha-dark file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-asha-orangeDim file:text-asha-orange hover:file:bg-asha-orange/20 cursor-pointer"
            />
            <a
              href="/sample-training-plan.json"
              download
              className="inline-flex items-center gap-1 text-xs font-body text-asha-orange hover:underline mt-1.5"
            >
              Download sample JSON
            </a>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={13} className="shrink-0" /> {parseError}
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div className="bg-asha-cream/60 border border-asha-border rounded-xl p-3 space-y-1">
              <div className="font-body font-semibold text-sm text-asha-dark">{parsed.name}</div>
              {parsed.description && <div className="text-xs font-body text-asha-muted">{parsed.description}</div>}
              <div className="text-xs font-body text-asha-muted">
                {actCount} activities · {needsDate ? 'Week/day format — needs start date' : 'Dated format'}
              </div>
            </div>
          )}

          {/* Start date (week/day format only) */}
          {needsDate && (
            <div>
              <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">
                Start Date (Week 1 Monday)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(snapMonday(e.target.value))}
                className="w-full text-sm font-body px-3 py-2 border border-asha-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-asha-orange/40"
              />
              {startDate && (
                <p className="text-[11px] font-body text-asha-muted mt-1">
                  Week 1 starts {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={13} className="shrink-0" /> {importError}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-asha-border">
          <button
            disabled={!canImport || saving}
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-2 bg-asha-orange text-white text-sm font-body font-semibold rounded-xl py-2.5 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-body text-asha-muted border border-asha-border rounded-xl hover:bg-asha-cream transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New plan modal ─────────────────────────────────────────────────────────────

function NewPlanModal({ uid, onDone, onClose }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const id = await createPlan(name.trim(), uid)
      onDone(id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-asha-border w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-asha-border">
          <h3 className="font-display font-bold text-asha-dark">New Plan</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-asha-cream transition-colors">
            <X size={16} className="text-asha-muted" />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-[11px] font-body font-semibold text-asha-muted uppercase tracking-wide mb-1">Plan Name</label>
          <input
            type="text"
            placeholder="e.g. Spring Sprint Block"
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            className="w-full text-sm font-body px-3 py-2 border border-asha-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-asha-orange/40"
          />
        </div>
        <div className="flex gap-2 p-5 pt-0">
          <button
            disabled={!name.trim() || saving}
            onClick={handleCreate}
            className="flex-1 flex items-center justify-center gap-2 bg-asha-orange text-white text-sm font-body font-semibold rounded-xl py-2.5 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-body text-asha-muted border border-asha-border rounded-xl hover:bg-asha-cream transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TrainingPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [p, t] = await Promise.all([getPlans(), getTeams()])
      const sorted = p.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setPlans(sorted)
      setTeams(t)
      if (!selectedId && sorted.length) setSelectedId(sorted[0].id)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function handlePlanUpdated(updated) {
    setPlans(ps => ps.map(p => p.id === updated.id ? updated : p))
  }

  function handlePlanDeleted(id) {
    setPlans(ps => {
      const next = ps.filter(p => p.id !== id)
      if (selectedId === id) setSelectedId(next[0]?.id || null)
      return next
    })
  }

  async function handleNewPlanDone(newId) {
    setShowNewModal(false)
    await load()
    setSelectedId(newId)
  }

  async function handleCopied(newId) {
    await load()
    setSelectedId(newId)
  }

  const selected = plans.find(p => p.id === selectedId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-asha-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 m-4">
        <AlertCircle size={14} className="shrink-0" />
        {error}
      </div>
    )
  }

  return (
    <div className="overflow-x-hidden">
      {/* ── Desktop: split pane ── */}
      <div className="hidden lg:flex min-h-[calc(100vh-120px)]">
        {/* Left: plan list */}
        <div className="w-72 border-r border-asha-border flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-asha-border flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-asha-dark">Training Plans</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1 text-xs font-body font-semibold text-asha-muted hover:text-asha-dark"
                title="Import from JSON"
              >
                <Upload size={13} />
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1 text-xs font-body font-semibold text-asha-orange hover:underline"
              >
                <Plus size={13} />
                New
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-asha-border/40">
            {plans.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm font-body text-asha-muted">No plans yet.</p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-2 text-xs font-body font-semibold text-asha-orange hover:underline"
                >
                  Create your first plan
                </button>
              </div>
            ) : (
              plans.map(p => {
                const actCount = p.activities?.length || 0
                const teamNames = teams.filter(t => p.teamIds?.includes(t.id)).map(t => t.name)
                const isSelected = p.id === selectedId
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${isSelected ? 'bg-asha-orangeDim' : 'hover:bg-asha-cream/60'}`}
                  >
                    <div className="font-body font-semibold text-sm text-asha-dark leading-tight">{p.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-body text-asha-muted">{actCount} session{actCount !== 1 ? 's' : ''}</span>
                      {teamNames.map(n => (
                        <span key={n} className="text-[10px] font-body font-semibold bg-asha-orange/10 text-asha-orange rounded-full px-2 py-0.5">{n}</span>
                      ))}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: plan detail */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <PlanDetail
              key={selected.id}
              plan={selected}
              teams={teams}
              onUpdated={handlePlanUpdated}
              onDeleted={handlePlanDeleted}
              onCopied={handleCopied}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="font-display font-bold text-lg text-asha-muted">No plan selected</p>
              <p className="text-sm font-body text-asha-muted/70 mt-1">Pick a plan from the left, or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: accordion list ── */}
      <div className="lg:hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-asha-border">
          <h2 className="font-display font-bold text-base text-asha-dark">Training Plans</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowUploadModal(true)} className="text-asha-muted" title="Import from JSON">
              <Upload size={15} />
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1 text-sm font-body font-semibold text-asha-orange"
            >
              <Plus size={14} />
              New
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-body text-asha-muted">No plans yet.</p>
            <button onClick={() => setShowNewModal(true)} className="mt-2 text-sm font-body font-semibold text-asha-orange hover:underline">
              Create your first plan
            </button>
          </div>
        ) : (
          <div className="divide-y divide-asha-border/40">
            {plans.map(p => {
              const actCount = p.activities?.length || 0
              const teamNames = teams.filter(t => p.teamIds?.includes(t.id)).map(t => t.name)
              const isOpen = mobileExpanded === p.id
              return (
                <div key={p.id} className="bg-white">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setMobileExpanded(isOpen ? null : p.id)}
                  >
                    <div>
                      <div className="font-body font-semibold text-sm text-asha-dark">{p.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] font-body text-asha-muted">{actCount} session{actCount !== 1 ? 's' : ''}</span>
                        {teamNames.map(n => (
                          <span key={n} className="text-[10px] font-body font-semibold bg-asha-orange/10 text-asha-orange rounded-full px-2 py-0.5">{n}</span>
                        ))}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-asha-muted flex-shrink-0" /> : <ChevronDown size={16} className="text-asha-muted flex-shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-asha-border/50">
                      <PlanDetail
                        key={p.id}
                        plan={p}
                        teams={teams}
                        onUpdated={handlePlanUpdated}
                        onDeleted={id => { handlePlanDeleted(id); setMobileExpanded(null) }}
                        onCopied={handleCopied}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewPlanModal
          uid={user.uid}
          onDone={handleNewPlanDone}
          onClose={() => setShowNewModal(false)}
        />
      )}
      {showUploadModal && (
        <UploadModal
          uid={user.uid}
          onDone={async newId => { setShowUploadModal(false); await load(); setSelectedId(newId) }}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  )
}
