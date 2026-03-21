import { useState, useEffect } from 'react'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, credentialsConfigured } from '../../utils/googleCalendar'
import {
  Plus, X, Calendar, Clock, MapPin, Users, Pencil, Trash2, Send,
  CheckCircle2, AlertCircle, Search, ChevronDown, ChevronUp,
} from 'lucide-react'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Recipient Picker ──────────────────────────────────────────────────────────

function RecipientPicker({ allUsers, teams, selectedUids, onChange }) {
  const [search, setSearch] = useState('')
  const [expandedTeams, setExpandedTeams] = useState(false)

  const toggleUid = (uid) => {
    const next = new Set(selectedUids)
    next.has(uid) ? next.delete(uid) : next.add(uid)
    onChange(next)
  }

  const toggleTeam = (team) => {
    const next = new Set(selectedUids)
    const members = team.memberIds ?? []
    const allSelected = members.every(uid => next.has(uid))
    members.forEach(uid => allSelected ? next.delete(uid) : next.add(uid))
    onChange(next)
  }

  const selectAll = () => onChange(new Set(allUsers.map(u => u.id)))
  const clearAll = () => onChange(new Set())

  const filtered = allUsers.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-body font-medium text-asha-muted uppercase tracking-wide">
          Recipients <span className="normal-case font-normal text-asha-orange">({selectedUids.size} selected)</span>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={selectAll} className="text-xs font-body text-asha-orange hover:underline">All</button>
          <button type="button" onClick={clearAll} className="text-xs font-body text-asha-muted hover:underline">Clear</button>
        </div>
      </div>

      {/* Teams */}
      {teams.length > 0 && (
        <div className="border border-asha-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedTeams(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-asha-cream/50 text-left"
          >
            <span className="font-body font-medium text-sm text-asha-dark">Add by Team</span>
            {expandedTeams ? <ChevronUp size={14} className="text-asha-muted" /> : <ChevronDown size={14} className="text-asha-muted" />}
          </button>
          {expandedTeams && (
            <div className="divide-y divide-asha-border/50">
              {teams.map(team => {
                const members = team.memberIds ?? []
                const allSelected = members.length > 0 && members.every(uid => selectedUids.has(uid))
                const someSelected = members.some(uid => selectedUids.has(uid))
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${allSelected ? 'bg-asha-orangeDim' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-asha-orange border-asha-orange' : someSelected ? 'bg-asha-orange/40 border-asha-orange/40' : 'border-gray-300'}`}>
                      {(allSelected || someSelected) && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-medium text-sm text-asha-dark">{team.name}</div>
                      <div className="font-body text-xs text-asha-muted">{members.length} members</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Individual */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-asha-muted" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search members…"
          className="w-full pl-8 pr-4 py-2 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-0.5 border border-asha-border rounded-xl p-1">
        {filtered.map(u => {
          const selected = selectedUids.has(u.id)
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggleUid(u.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${selected ? 'bg-asha-orangeDim' : 'hover:bg-gray-50'}`}
            >
              {u.photoURL
                ? <img src={u.photoURL} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                : <div className="w-6 h-6 rounded-full bg-asha-cream flex items-center justify-center flex-shrink-0"><Users size={11} className="text-asha-muted" /></div>}
              <div className="flex-1 min-w-0">
                <div className="font-body text-sm text-asha-dark truncate">{u.name || u.email}</div>
                <div className="font-body text-xs text-asha-muted truncate">{u.email}</div>
              </div>
              {selected && <CheckCircle2 size={14} className="text-asha-orange flex-shrink-0" />}
            </button>
          )
        })}
        {filtered.length === 0 && <p className="font-body text-xs text-asha-muted text-center py-3">No members match</p>}
      </div>
    </div>
  )
}

// ── Event Modal ───────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: '', description: '', location: '', date: '', startTime: '', endTime: '', sendInvite: true }

function EventModal({ initial, allUsers, teams, calendarReady, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...EMPTY_FORM, ...initial, sendInvite: true } : { ...EMPTY_FORM })
  const [selectedUids, setSelectedUids] = useState(new Set(initial?.recipientIds ?? []))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
      setError('Title, date, and times are required.')
      return
    }
    if (selectedUids.size === 0) {
      setError('Select at least one recipient.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ form, recipientIds: [...selectedUids] })
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-asha-border w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-asha-border flex-shrink-0">
          <h2 className="font-display font-bold text-asha-dark">{initial ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {/* Title */}
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Morning Training Session"
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors" />
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Start *</label>
              <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">End *</label>
              <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. Almaden Lake Park"
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Optional notes for attendees…"
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors resize-none" />
          </div>

          {/* Recipients */}
          <RecipientPicker
            allUsers={allUsers}
            teams={teams}
            selectedUids={selectedUids}
            onChange={setSelectedUids}
          />

          {/* Send invite toggle */}
          <div className={`rounded-xl p-3 flex items-center justify-between ${calendarReady ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-asha-border'}`}>
            <div>
              <div className="font-body font-medium text-sm text-asha-dark">Send Google Calendar invite</div>
              <div className="font-body text-xs text-asha-muted mt-0.5">
                {calendarReady ? 'Invites will be sent to all recipients' : 'Calendar not configured — set up in Settings'}
              </div>
            </div>
            {calendarReady ? (
              <button type="button" onClick={() => set('sendInvite', !form.sendInvite)}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.sendInvite ? 'bg-asha-orange' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.sendInvite ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            ) : (
              <AlertCircle size={16} className="text-asha-muted flex-shrink-0" />
            )}
          </div>

          {error && <p className="font-body text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-2 p-5 border-t border-asha-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-asha-border font-body font-medium text-sm text-asha-muted hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? 'Saving…' : <><Send size={14} />{initial ? 'Save Changes' : 'Create Event'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { profile } = useAuth()
  const [events, setEvents] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarReady, setCalendarReady] = useState(false)
  const [modal, setModal] = useState(null)

  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]))

  const load = async () => {
    const [eventsSnap, usersSnap, teamsSnap, calReady] = await Promise.all([
      getDocs(query(collection(db, 'events'), orderBy('date', 'asc'))),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'teams')),
      credentialsConfigured(),
    ])

    setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setAllUsers(
      usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role !== 'serviceUser')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    )
    setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)))
    setCalendarReady(calReady)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async ({ form, recipientIds }) => {
    const emails = recipientIds.map(uid => userMap[uid]?.email).filter(Boolean)
    const calArgs = {
      title: form.title, description: form.description, location: form.location,
      date: form.date, startTime: form.startTime, endTime: form.endTime,
      attendeeEmails: emails,
    }

    const existing = modal?.event
    let calendarEventId = existing?.calendarEventId ?? null
    let calendarLink = existing?.calendarLink ?? null

    if (form.sendInvite && calendarReady) {
      if (calendarEventId) {
        // Update the existing calendar event
        const result = await updateCalendarEvent(calendarEventId, calArgs)
        calendarEventId = result.calendarEventId
        calendarLink = result.calendarLink
      } else {
        // Create a new calendar event
        const result = await createCalendarEvent(calArgs)
        calendarEventId = result.calendarEventId
        calendarLink = result.calendarLink
      }
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      recipientIds,
      inviteSent: !!(calendarEventId),
      calendarEventId: calendarEventId ?? null,
      calendarLink: calendarLink ?? null,
      createdBy: profile.uid,
    }

    if (existing) {
      await updateDoc(doc(db, 'events', existing.id), { ...payload, updatedAt: serverTimestamp() })
    } else {
      await addDoc(collection(db, 'events'), { ...payload, createdAt: serverTimestamp() })
    }
    setModal(null)
    load()
  }

  const handleDelete = async (event) => {
    if (!confirm(`Delete "${event.title}"?`)) return
    // Cancel the Google Calendar event so attendees get a cancellation email
    if (event.calendarEventId) {
      try { await deleteCalendarEvent(event.calendarEventId) } catch (_) {}
    }
    await deleteDoc(doc(db, 'events', event.id))
    setEvents(prev => prev.filter(e => e.id !== event.id))
  }

  const now = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter(e => e.date >= now)
  const past = events.filter(e => e.date < now)

  const EventCard = ({ event }) => {
    const recipients = (event.recipientIds ?? []).map(uid => userMap[uid]).filter(Boolean)
    return (
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-body font-medium text-sm text-asha-dark">{event.title}</span>
            {event.inviteSent && (
              <span className="text-[9px] font-body text-green-600 bg-green-50 px-1.5 py-px rounded-full">Invited</span>
            )}
          </div>
          <div className="font-body text-[10px] text-asha-muted">
            {fmtDate(event.date)} · {fmtTime(event.startTime)}–{fmtTime(event.endTime)}
            {event.location && ` · ${event.location}`}
          </div>
          {recipients.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex -space-x-1">
                {recipients.slice(0, 5).map(r => (
                  r.photoURL
                    ? <img key={r.id} src={r.photoURL} alt="" className="w-4 h-4 rounded-full border border-white" />
                    : <div key={r.id} className="w-4 h-4 rounded-full bg-asha-orangeDim border border-white flex items-center justify-center"><Users size={8} className="text-asha-orange" /></div>
                ))}
              </div>
              <span className="font-body text-[10px] text-asha-muted ml-1">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</span>
              {event.calendarLink && (
                <a href={event.calendarLink} target="_blank" rel="noopener noreferrer" className="font-body text-[10px] text-asha-orange ml-1">Calendar</a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => setModal({ event })} className="p-1.5 hover:bg-gray-100 rounded-lg text-asha-muted"><Pencil size={13} /></button>
          <button onClick={() => handleDelete(event)} className="p-1.5 hover:bg-red-50 rounded-lg text-asha-muted hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Events</h1>
        <button onClick={() => setModal({ event: null })}
          className="flex items-center gap-1.5 bg-asha-orange text-white px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-asha-orangeLight transition-colors">
          <Plus size={13} /> New Event
        </button>
      </div>

      {!calendarReady && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
          <p className="font-body text-sm text-amber-700">Calendar not configured. Go to <strong>Settings</strong> to add credentials — events can still be created without sending invites.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-12 animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={24} className="text-asha-muted mx-auto mb-2" />
          <p className="font-body text-sm text-asha-muted mb-3">No events yet.</p>
          <button onClick={() => setModal({ event: null })}
            className="flex items-center gap-1.5 mx-auto bg-asha-orange text-white px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-asha-orangeLight transition-colors">
            <Plus size={13} /> New Event
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Upcoming</h2>
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {upcoming.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Past</h2>
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50 opacity-60">
                {past.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <EventModal
          initial={modal.event}
          allUsers={allUsers}
          teams={teams}
          calendarReady={calendarReady}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
