import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { getCached, setCached, invalidate } from '../../utils/cache'
import { Plus, X, Calendar, MapPin, Flag, Pencil, Trash2, CheckCircle2, Circle, Users, ExternalLink, Tag, Download, CheckSquare, Lock, Unlock } from 'lucide-react'

const RACE_TYPES = [
  { key: 'swim', label: 'Swim' },
  { key: 'triathlon', label: 'Triathlon' },
  { key: 'aquathon', label: 'Aquathon' },
]

const EVENT_PRESETS = ['Sprint', 'Olympic', 'Half (70.3)', 'Full (140.6)', 'Aquabike', 'Aquathon', 'Relay', 'Swim', '1 Mile', '2.4 Mile', '10 km']

const TRI_DISTANCES = [
  { label: 'Sprint', event: 'Sprint' },
  { label: 'Olympic', event: 'Olympic' },
  { label: '70.3', event: 'Half (70.3)' },
  { label: '140.6', event: 'Full (140.6)' },
]

const SEED_RACES = [
  { name: 'Donner Lake Swim', type: 'swim', date: '2026-07-26', location: 'Donner Lake, Truckee, CA', description: '', registrationUrl: 'https://tahoeswimming.com/events/truckee-open-water-swim/', couponCode: 'TeamAsha2024', events: ['1 Mile', '2.4 Mile'], isActive: true },
  { name: 'Tri Santa Cruz', type: 'triathlon', date: '2026-08-09', location: 'Santa Cruz, CA', description: '', registrationUrl: 'https://www.trisignup.com/Race/CA/SantaCruz/TriSantaCruz', couponCode: 'ASHA15', events: ['Sprint', 'Olympic'], isActive: true },
  { name: 'Alcatraz First Swim', type: 'swim', date: '', location: 'San Francisco, CA', description: 'Discounted prices available', registrationUrl: '', couponCode: '', events: ['Swim'], isActive: true },
  { name: 'Lake Tahoe Swim', type: 'swim', date: '2026-08-30', location: 'Lake Tahoe, CA', description: '', registrationUrl: 'https://tahoeswimming.com/events/lake-tahoe-open-water-swim/', couponCode: 'TeamAsha2024', events: ['1 Mile', '2.4 Mile', '10 km'], isActive: true },
  { name: 'IM Santa Cruz 70.3', type: 'triathlon', date: '2026-09-13', location: 'Santa Cruz, CA', description: '', registrationUrl: 'https://www.ironman.com/im703-santa-cruz', couponCode: '', events: ['Half (70.3)'], isActive: true },
  { name: 'Bridge-to-Bridge (B2B)', type: 'swim', date: '', location: 'San Francisco, CA', description: 'Discounted prices available', registrationUrl: '', couponCode: '', events: ['Swim'], isActive: true },
  { name: 'Santa Cruz Triathlon', type: 'triathlon', date: '2026-09-27', location: 'Santa Cruz, CA', description: '', registrationUrl: 'https://www.santacruztriathlon.org/', couponCode: 'ASHA10', events: ['Sprint', 'Olympic'], isActive: true },
  { name: 'Alcatraz Second Swim', type: 'swim', date: '', location: 'San Francisco, CA', description: 'Discounted prices available', registrationUrl: '', couponCode: '', events: ['Swim'], isActive: true },
  { name: 'IM California 140.6', type: 'triathlon', date: '2026-10-18', location: 'Sacramento, CA', description: '', registrationUrl: 'https://www.ironman.com/im-california', couponCode: '', events: ['Full (140.6)'], isActive: true },
]

function fmtDate(dateStr) {
  if (!dateStr) return 'TBD'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

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

const EMPTY_FORM = { name: '', type: 'triathlon', date: '', location: '', description: '', registrationUrl: '', couponCode: '', events: [], isActive: true, isLocked: false }

function RaceModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...EMPTY_FORM, ...initial } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const toggleEvent = (ev) => setForm(f => ({
    ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
  }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-asha-border w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-asha-border flex-shrink-0">
          <h2 className="font-display font-bold text-asha-dark">{initial ? 'Edit Race' : 'Add Race'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Race Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
              placeholder="e.g. Ironman 70.3 Santa Cruz" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Race Type</label>
            <div className="flex gap-2">
              {RACE_TYPES.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, type: key }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all ${form.type === key ? 'bg-asha-dark text-white border-asha-dark' : 'border-asha-border text-asha-muted hover:border-asha-orange/40'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors" />
              <p className="font-body text-xs text-asha-muted mt-1">Leave blank for TBD</p>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
                placeholder="City, State" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
              placeholder="Optional notes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Registration URL</label>
              <input value={form.registrationUrl} onChange={e => setForm(f => ({ ...f, registrationUrl: e.target.value }))}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
                placeholder="https://…" />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Coupon Code</label>
              <input value={form.couponCode} onChange={e => setForm(f => ({ ...f, couponCode: e.target.value }))}
                className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
                placeholder="e.g. ASHA15" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">Available Events</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_PRESETS.map(ev => (
                <button key={ev} type="button" onClick={() => toggleEvent(ev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all ${form.events.includes(ev) ? 'bg-asha-orange text-white border-asha-orange' : 'border-asha-border text-asha-muted hover:border-asha-orange/40'}`}>
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${form.isActive ? 'bg-asha-orange' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="font-body text-sm text-asha-dark">Visible to athletes</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isLocked: !f.isLocked }))}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${form.isLocked ? 'bg-asha-dark' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isLocked ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="font-body text-sm text-asha-dark">Lock registrations</span>
            <span className="font-body text-xs text-asha-muted">(athletes can't change selections)</span>
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-asha-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-asha-border font-body font-medium text-sm text-asha-muted hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Race'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterBar({ typeFilter, setTypeFilter, distanceFilter, setDistanceFilter }) {
  const handleType = (t) => { setTypeFilter(t); setDistanceFilter(null) }
  return (
    <div className="space-y-2 mb-5">
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ['swim', 'Swim'], ['triathlon', 'Triathlon'], ['aquathon', 'Aquathon']].map(([key, label]) => (
          <button key={key} onClick={() => handleType(key)}
            className={`px-2.5 py-1 rounded-lg font-body font-medium text-xs transition-all ${typeFilter === key ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}>
            {label}
          </button>
        ))}
      </div>
      {typeFilter === 'triathlon' && (
        <div className="flex gap-2 flex-wrap pl-1">
          {TRI_DISTANCES.map(({ label }) => (
            <button key={label} onClick={() => setDistanceFilter(distanceFilter === label ? null : label)}
              className={`px-3 py-1 rounded-lg font-body font-medium text-xs transition-all ${distanceFilter === label ? 'bg-asha-orange text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RaceManagement() {
  const [tab, setTab] = useState('races')
  const [races, setRaces] = useState([])
  const [users, setUsers] = useState({})
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selectedRace, setSelectedRace] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [distanceFilter, setDistanceFilter] = useState(null)

  const load = async (forceRefresh = false) => {
    if (forceRefresh) invalidate('races')
    let racesList = getCached('races')

    const [usersSnap, regsSnap, racesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),              // small, always fresh (role changes)
      getDocs(collection(db, 'raceRegistrations')),  // always fresh
      racesList ? Promise.resolve(null) : getDocs(collection(db, 'races')),
    ])

    if (racesSnap) {
      racesList = racesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setCached('races', racesList)
    }

    const sorted = [...racesList].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date > b.date ? 1 : -1
    })
    setRaces(sorted)
    if (racesList.length > 0) setSelectedRace(prev => prev || racesList[0].id)

    const usersMap = {}
    usersSnap.docs.forEach(d => { usersMap[d.id] = { id: d.id, ...d.data() } })
    setUsers(usersMap)

    setRegs(regsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    if (modal?.race) {
      await updateDoc(doc(db, 'races', modal.race.id), { ...form, updatedAt: serverTimestamp() })
    } else {
      await addDoc(collection(db, 'races'), { ...form, createdAt: serverTimestamp() })
    }
    setModal(null)
    load(true)
  }

  const handleToggleLock = async (race) => {
    await updateDoc(doc(db, 'races', race.id), { isLocked: !race.isLocked, updatedAt: serverTimestamp() })
    invalidate('races')
    setRaces(prev => prev.map(r => r.id === race.id ? { ...r, isLocked: !r.isLocked } : r))
  }

  const handleDelete = async (race) => {
    if (!confirm(`Delete "${race.name}"? This cannot be undone.`)) return
    await deleteDoc(doc(db, 'races', race.id))
    invalidate('races')
    setRaces(prev => prev.filter(r => r.id !== race.id))
    if (selectedRace === race.id) setSelectedRace(null)
  }

  const handleSeed = async () => {
    if (!confirm('Add the 9 default Asha Tri races?')) return
    setSeeding(true)
    for (const race of SEED_RACES) {
      await addDoc(collection(db, 'races'), { ...race, createdAt: serverTimestamp() })
    }
    setSeeding(false)
    load(true)
  }

  // Apply filters to race list
  const applyFilters = (raceList) => raceList.filter(race => {
    if (typeFilter === 'swim') return race.type === 'swim'
    if (typeFilter === 'aquathon') return race.type === 'aquathon'
    if (typeFilter === 'triathlon') {
      if (race.type !== 'triathlon') return false
      if (distanceFilter) {
        const eventStr = TRI_DISTANCES.find(d => d.label === distanceFilter)?.event
        return race.events?.includes(eventStr)
      }
      return true
    }
    return true
  })

  const filteredRaces = applyFilters(races)
  const selectedRegs = regs.filter(r => r.raceId === selectedRace)
  const selectedRaceObj = races.find(r => r.id === selectedRace)
  const totalRegistered = selectedRegs.filter(r => r.isRegistered).length
  const byEvent = {}
  selectedRegs.forEach(r => {
    if (!byEvent[r.event]) byEvent[r.event] = []
    byEvent[r.event].push(r)
  })

  return (
    <div className="max-w-full lg:px-6 px-4 py-4 sm:py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Race Management</h1>
        {tab === 'races' && (
          <div className="flex gap-2">
            {races.length === 0 && (
              <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-1.5 border border-asha-border text-asha-muted px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Download size={13} />{seeding ? 'Adding…' : 'Seed Races'}
              </button>
            )}
            <button onClick={() => setModal({ race: null })}
              className="flex items-center gap-1.5 bg-asha-orange text-white px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-asha-orangeLight transition-colors">
              <Plus size={14} /> Add Race
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-asha-cream rounded-xl p-1 w-fit">
        {[['races', Flag, 'Races'], ['registrations', CheckSquare, 'Registrations']].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${tab === key ? 'bg-white text-asha-dark shadow-sm' : 'text-asha-muted hover:text-asha-dark'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-10 animate-pulse" />)}</div>
      ) : tab === 'races' ? (

        /* ── Races tab ── */
        <>
          {races.length > 0 && <FilterBar typeFilter={typeFilter} setTypeFilter={setTypeFilter} distanceFilter={distanceFilter} setDistanceFilter={setDistanceFilter} />}
          {races.length === 0 ? (
            <div className="text-center py-16">
              <Flag size={32} className="text-asha-muted mx-auto mb-3" />
              <p className="font-body text-asha-muted mb-4">No races yet.</p>
              <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-2 mx-auto border border-asha-border text-asha-muted px-4 py-2.5 rounded-xl font-body font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Download size={15} />{seeding ? 'Adding…' : 'Seed Default Races'}
              </button>
            </div>
          ) : filteredRaces.length === 0 ? (
            <div className="text-center py-12"><Flag size={28} className="text-asha-muted mx-auto mb-3" /><p className="font-body text-asha-muted text-sm">No races match this filter</p></div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border border-asha-border">
                <table className="w-full">
                  <thead className="bg-asha-cream/50 border-b border-asha-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide w-4"></th>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Race</th>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Location</th>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Events</th>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Athletes</th>
                      <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-asha-border/40">
                    {filteredRaces.map(race => {
                      const raceRegs = regs.filter(r => r.raceId === race.id)
                      return (
                        <tr key={race.id} className="hover:bg-asha-cream/30 transition-colors group">
                          <td className="px-4 py-3">
                            <div className={`w-2 h-2 rounded-full ${race.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-body font-semibold text-sm text-asha-dark">{race.name}</span>
                              <TypeBadge type={race.type} />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-asha-muted whitespace-nowrap">{fmtDate(race.date)}</td>
                          <td className="px-4 py-3 font-body text-sm text-asha-muted">{race.location || '—'}</td>
                          <td className="px-4 py-3 font-body text-sm text-asha-muted">{race.events?.join(', ') || '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-sm text-asha-orange">{raceRegs.length}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => handleToggleLock(race)} title={race.isLocked ? 'Unlock registrations' : 'Lock registrations'} className={`p-1.5 rounded-lg transition-colors ${race.isLocked ? 'text-asha-dark hover:bg-gray-100' : 'text-asha-muted hover:bg-gray-100 hover:text-asha-dark'}`}>
                                {race.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                              </button>
                              <button onClick={() => setModal({ race })} title="Edit" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted hover:text-asha-dark"><Pencil size={14} /></button>
                              <button onClick={() => handleDelete(race)} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="lg:hidden bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {filteredRaces.map(race => {
                  const raceRegs = regs.filter(r => r.raceId === race.id)
                  return (
                    <div key={race.id}>
                      <div className="flex items-center gap-3 px-3.5 py-2.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${race.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="font-body font-semibold text-sm text-asha-dark">{race.name}</div>
                            <TypeBadge type={race.type} />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="font-body text-xs text-asha-muted flex items-center gap-1"><Calendar size={11} />{fmtDate(race.date)}</span>
                            {race.location && <span className="font-body text-xs text-asha-muted flex items-center gap-1"><MapPin size={11} />{race.location}</span>}
                            {race.registrationUrl && <a href={race.registrationUrl} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-asha-orange flex items-center gap-1 hover:underline"><ExternalLink size={11} />Register</a>}
                            {race.couponCode && <span className="font-body text-xs text-asha-muted flex items-center gap-1"><Tag size={10} />{race.couponCode}</span>}
                          </div>
                          {race.events?.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {race.events.map(ev => <span key={ev} className="px-2 py-0.5 rounded-md bg-asha-cream font-body text-xs text-asha-muted">{ev}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-center mr-1">
                            <div className="font-mono font-bold text-sm text-asha-orange leading-tight">{raceRegs.length}</div>
                            <div className="font-body text-[10px] text-asha-muted">athletes</div>
                          </div>
                          <button onClick={() => handleToggleLock(race)} title={race.isLocked ? 'Unlock registrations' : 'Lock registrations'} className={`p-1.5 rounded-lg transition-colors ${race.isLocked ? 'text-asha-dark hover:bg-gray-100' : 'text-asha-muted hover:bg-gray-100 hover:text-asha-dark'}`}>
                            {race.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                          <button onClick={() => setModal({ race })} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-asha-muted hover:text-asha-dark"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(race)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-asha-muted hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>

      ) : tab === 'registrations' ? (

        /* ── Registrations tab ── */
        races.length === 0 ? (
          <div className="text-center py-16"><Flag size={32} className="text-asha-muted mx-auto mb-3" /><p className="font-body text-asha-muted">No races yet</p></div>
        ) : (
          <>
            <FilterBar typeFilter={typeFilter} setTypeFilter={setTypeFilter} distanceFilter={distanceFilter} setDistanceFilter={setDistanceFilter} />

            <div className="lg:flex lg:min-h-[600px] lg:gap-0 lg:border lg:border-asha-border lg:rounded-xl lg:overflow-hidden bg-white">
              {/* Left: race selector — mobile pills, desktop vertical list */}
              <div className="lg:w-72 lg:border-r lg:border-asha-border lg:overflow-y-auto lg:flex-shrink-0">
                {/* Mobile pill buttons */}
                <div className="mb-4 flex flex-wrap gap-1.5 lg:hidden">
                  {applyFilters(races).map(r => (
                    <button key={r.id} onClick={() => setSelectedRace(r.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-body font-medium border transition-all ${selectedRace === r.id ? 'bg-asha-dark text-white border-asha-dark' : 'bg-white border-asha-border text-asha-muted hover:border-asha-orange/40'}`}>
                      {r.name}<TypeBadge type={r.type} />
                    </button>
                  ))}
                </div>
                {/* Desktop vertical list */}
                <div className="hidden lg:block divide-y divide-asha-border/40">
                  <div className="px-4 py-3 bg-asha-cream/50">
                    <span className="font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Select Race</span>
                  </div>
                  {applyFilters(races).map(r => (
                    <button key={r.id} onClick={() => setSelectedRace(r.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${selectedRace === r.id ? 'bg-asha-orangeDim border-l-2 border-asha-orange' : 'hover:bg-asha-cream/30 border-l-2 border-transparent'}`}>
                      <div className="font-body font-medium text-sm text-asha-dark truncate">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TypeBadge type={r.type} />
                        <span className="font-body text-xs text-asha-muted">{fmtDate(r.date)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: selected race details */}
              <div className="lg:flex-1 lg:p-6">
                {selectedRaceObj && (
                  <>
                    <div className="bg-white rounded-xl border border-asha-border lg:border-0 lg:rounded-none p-3.5 lg:p-0 mb-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-body font-semibold text-sm text-asha-dark">{selectedRaceObj.name}</span>
                            <TypeBadge type={selectedRaceObj.type} />
                          </div>
                          <div className="font-body text-[11px] text-asha-muted flex items-center gap-1 mt-0.5"><Calendar size={10} />{fmtDate(selectedRaceObj.date)}</div>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="font-mono font-bold text-xl text-asha-orange leading-tight">{selectedRegs.length}</div>
                            <div className="font-body text-[10px] text-asha-muted uppercase tracking-wide">participating</div>
                          </div>
                          <div className="text-center">
                            <div className="font-mono font-bold text-xl text-green-500 leading-tight">{totalRegistered}</div>
                            <div className="font-body text-[10px] text-asha-muted uppercase tracking-wide">registered</div>
                          </div>
                        </div>
                      </div>
                      {Object.keys(byEvent).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-asha-border">
                          {Object.entries(byEvent).map(([ev, evRegs]) => (
                            <div key={ev} className="flex items-center gap-1 bg-asha-cream rounded-md px-1.5 py-0.5">
                              <span className="font-body text-[11px] text-asha-muted">{ev}</span>
                              <span className="font-mono text-[11px] font-semibold text-asha-dark">{evRegs.length}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedRegs.length === 0 ? (
                      <div className="text-center py-12"><Users size={28} className="text-asha-muted mx-auto mb-3" /><p className="font-body text-asha-muted text-sm">No athletes have selected this race yet</p></div>
                    ) : (
                      <>
                        {/* Desktop table */}
                        <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border border-asha-border">
                          <table className="w-full">
                            <thead className="bg-asha-cream/50 border-b border-asha-border">
                              <tr>
                                <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Athlete</th>
                                <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Event</th>
                                <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-asha-border/40">
                              {[...selectedRegs].sort((a, b) => (a.event || '').localeCompare(b.event || '')).map(reg => {
                                const u = users[reg.athleteId]
                                return (
                                  <tr key={reg.id} className="hover:bg-asha-cream/30 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {u?.photoURL ? <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-asha-cream flex items-center justify-center flex-shrink-0"><Users size={12} className="text-asha-muted" /></div>}
                                        <div>
                                          <div className="font-body font-medium text-sm text-asha-dark">{u?.name || reg.athleteId}</div>
                                          <div className="font-body text-xs text-asha-muted">{u?.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-0.5 rounded-md bg-asha-cream font-body text-xs font-medium text-asha-dark">{reg.event}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {reg.isRegistered
                                        ? <span className="flex items-center gap-1 text-green-600 font-body text-xs font-medium"><CheckCircle2 size={12} />Registered</span>
                                        : <span className="flex items-center gap-1 text-asha-muted font-body text-xs"><Circle size={12} />Not yet</span>}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile list */}
                        <div className="lg:hidden bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                          {[...selectedRegs].sort((a, b) => (a.event || '').localeCompare(b.event || '')).map(reg => {
                            const u = users[reg.athleteId]
                            return (
                              <div key={reg.id} className="flex items-center gap-3 px-3.5 py-2.5">
                                {u?.photoURL ? <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-asha-cream flex items-center justify-center flex-shrink-0"><Users size={12} className="text-asha-muted" /></div>}
                                <div className="flex-1 min-w-0">
                                  <div className="font-body font-medium text-sm text-asha-dark">{u?.name || reg.athleteId}</div>
                                  <div className="font-body text-[11px] text-asha-muted">{u?.email}</div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="px-2 py-0.5 rounded-md bg-asha-cream font-body text-xs font-medium text-asha-dark">{reg.event}</span>
                                  {reg.isRegistered
                                    ? <span className="flex items-center gap-1 text-green-600 font-body text-xs font-medium"><CheckCircle2 size={12} />Registered</span>
                                    : <span className="flex items-center gap-1 text-asha-muted font-body text-xs"><Circle size={12} />Not yet</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )

      ) : null}

      {modal && (
        <RaceModal initial={modal.race ? { ...modal.race } : null} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
