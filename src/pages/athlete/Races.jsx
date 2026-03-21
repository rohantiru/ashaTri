import { useEffect, useState } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { getCached, setCached } from '../../utils/cache'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, MapPin, Flag, CheckCircle2, Circle, ExternalLink, Tag, Lock } from 'lucide-react'

function fmtDate(dateStr) {
  if (!dateStr) return 'TBD'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

const TRI_DISTANCES = [
  { label: 'Sprint', event: 'Sprint' },
  { label: 'Olympic', event: 'Olympic' },
  { label: '70.3', event: 'Half (70.3)' },
  { label: '140.6', event: 'Full (140.6)' },
]

export default function AthleteRaces() {
  const { user } = useAuth()
  const [races, setRaces] = useState([])
  const [myRegs, setMyRegs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [typeFilter, setTypeFilter] = useState('all')
  const [distanceFilter, setDistanceFilter] = useState(null)

  useEffect(() => {
    async function load() {
      let cachedRaces = getCached('races')

      const [regsSnap, permDoc, racesSnap] = await Promise.all([
        getDocs(query(collection(db, 'raceRegistrations'), where('athleteId', '==', user.uid))), // always fresh
        getDoc(doc(db, 'racePermissions', user.uid)),                                            // always fresh
        cachedRaces ? Promise.resolve(null) : getDocs(collection(db, 'races')),
      ])

      if (racesSnap) {
        cachedRaces = racesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setCached('races', cachedRaces)
      }

      const allowedIds = permDoc.exists() ? new Set(permDoc.data().allowedRaceIds) : null
      const racesList = cachedRaces
        .filter(r => r.isActive && (allowedIds === null || allowedIds.has(r.id)))
        .sort((a, b) => {
          if (!a.date && !b.date) return 0
          if (!a.date) return 1
          if (!b.date) return -1
          return a.date > b.date ? 1 : -1
        })
      setRaces(racesList)
      const regsMap = {}
      regsSnap.docs.forEach(d => { regsMap[d.data().raceId] = { id: d.id, ...d.data() } })
      setMyRegs(regsMap)
      setLoading(false)
    }
    load()
  }, [user.uid])

  const handleEventSelect = async (race, event) => {
    const existing = myRegs[race.id]
    setSaving(s => ({ ...s, [race.id]: true }))
    if (existing?.event === event) {
      await deleteDoc(doc(db, 'raceRegistrations', existing.id))
      setMyRegs(m => { const n = { ...m }; delete n[race.id]; return n })
    } else {
      const regId = `${user.uid}_${race.id}`
      const data = {
        raceId: race.id,
        athleteId: user.uid,
        event,
        isRegistered: existing?.isRegistered ?? false,
        updatedAt: serverTimestamp(),
        ...(!existing ? { createdAt: serverTimestamp() } : {}),
      }
      await setDoc(doc(db, 'raceRegistrations', regId), data, { merge: true })
      setMyRegs(m => ({ ...m, [race.id]: { id: regId, ...m[race.id], ...data } }))
    }
    setSaving(s => ({ ...s, [race.id]: false }))
  }

  const handleRegisteredToggle = async (race) => {
    const existing = myRegs[race.id]
    if (!existing) return
    setSaving(s => ({ ...s, [race.id]: true }))
    const newVal = !existing.isRegistered
    await setDoc(doc(db, 'raceRegistrations', existing.id), { isRegistered: newVal, updatedAt: serverTimestamp() }, { merge: true })
    setMyRegs(m => ({ ...m, [race.id]: { ...m[race.id], isRegistered: newVal } }))
    setSaving(s => ({ ...s, [race.id]: false }))
  }

  // Filtering
  const filtered = races.filter(race => {
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

  const handleTypeFilter = (t) => {
    setTypeFilter(t)
    setDistanceFilter(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-asha-dark">Races</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Select your event and track your registration status</p>
      </div>

      {/* Filters */}
      {!loading && races.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {[['all', 'All'], ['swim', 'Swim'], ['triathlon', 'Triathlon'], ['aquathon', 'Aquathon']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleTypeFilter(key)}
                className={`px-2.5 py-1 rounded-lg font-body font-medium text-xs transition-all ${
                  typeFilter === key ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {typeFilter === 'triathlon' && (
            <div className="flex gap-2 flex-wrap pl-1">
              {TRI_DISTANCES.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => setDistanceFilter(distanceFilter === label ? null : label)}
                  className={`px-2.5 py-0.5 rounded-lg font-body font-medium text-xs transition-all ${
                    distanceFilter === label ? 'bg-asha-orange text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-36 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
            <Flag size={24} className="text-asha-orange" />
          </div>
          <h3 className="font-display font-semibold text-asha-dark mb-1">
            {races.length === 0 ? 'No races yet' : 'No races match this filter'}
          </h3>
          <p className="font-body text-asha-muted text-sm">
            {races.length === 0 ? 'Your coordinator will add upcoming races here' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(race => {
            const reg = myRegs[race.id]
            const days = daysUntil(race.date)
            const isPast = days !== null && days < 0
            const isLocked = !!race.isLocked

            return (
              <div
                key={race.id}
                className={`bg-white rounded-2xl border transition-all ${reg ? 'border-asha-orange/40 shadow-sm' : 'border-asha-border'}`}
              >
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-lg text-asha-dark leading-tight mb-1">{race.name}</h2>
                      {race.type && (
                        <span className={`inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full mb-0.5 ${
                          race.type === 'swim' ? 'bg-blue-50 text-blue-600' :
                          race.type === 'triathlon' ? 'bg-asha-orangeDim text-asha-orange' :
                          race.type === 'aquathon' ? 'bg-purple-50 text-purple-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {race.type === 'swim' ? 'Swim' : race.type === 'triathlon' ? 'Tri' : race.type === 'aquathon' ? 'Aquathon' : race.type}
                        </span>
                      )}
                      {race.description && <p className="font-body text-sm text-asha-muted">{race.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isLocked && (
                        <span className="flex items-center gap-1 text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          <Lock size={9} />Locked
                        </span>
                      )}
                      {days !== null ? (
                        <div className={`text-[10px] font-body font-semibold px-1.5 py-0.5 rounded-full ${
                          isPast ? 'bg-gray-100 text-gray-400' :
                          days === 0 ? 'bg-asha-orange text-white' :
                          days <= 14 ? 'bg-red-50 text-red-600' :
                          days <= 60 ? 'bg-amber-50 text-amber-600' :
                          'bg-asha-cream text-asha-muted'
                        }`}>
                          {isPast ? 'Past' : days === 0 ? 'Today!' : `${days}d away`}
                        </div>
                      ) : (
                        <div className="text-[10px] font-body font-semibold px-1.5 py-0.5 rounded-full bg-asha-cream text-asha-muted">TBD</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 font-body text-xs text-asha-muted">
                      <Calendar size={12} />{fmtDate(race.date)}
                    </span>
                    {race.location && (
                      <span className="flex items-center gap-1.5 font-body text-xs text-asha-muted">
                        <MapPin size={12} />{race.location}
                      </span>
                    )}
                  </div>

                  {(race.registrationUrl || race.couponCode) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      {race.registrationUrl && (
                        <a href={race.registrationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-body text-xs text-asha-orange hover:underline">
                          <ExternalLink size={11} />Register
                        </a>
                      )}
                      {race.couponCode && (
                        <span className="flex items-center gap-1.5 font-body text-xs text-asha-muted bg-asha-cream px-1.5 py-0.5 rounded">
                          <Tag size={10} />{race.couponCode}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {race.events?.length > 0 && (
                  <div className="px-5 pb-3">
                    <p className="text-xs font-body font-medium text-asha-muted uppercase tracking-wide mb-2">My event</p>
                    <div className="flex flex-wrap gap-2">
                      {race.events.map(ev => (
                        <button
                          key={ev}
                          onClick={() => !isPast && !isLocked && !saving[race.id] && handleEventSelect(race, ev)}
                          disabled={isPast || isLocked || saving[race.id]}
                          className={`px-2.5 py-1 rounded-lg text-xs font-body font-medium border transition-all ${
                            reg?.event === ev
                              ? isLocked ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-asha-orange text-white border-asha-orange'
                              : isPast || isLocked
                              ? 'border-asha-border text-asha-muted opacity-40 cursor-not-allowed'
                              : 'border-asha-border text-asha-muted hover:border-asha-orange/50 hover:text-asha-dark'
                          }`}
                        >
                          {ev}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {reg && (
                  <div className="px-5 pb-5">
                    <button
                      onClick={() => !isPast && !isLocked && !saving[race.id] && handleRegisteredToggle(race)}
                      disabled={isPast || isLocked || saving[race.id]}
                      className="flex items-center gap-2.5 group disabled:opacity-50"
                    >
                      {reg.isRegistered
                        ? <CheckCircle2 size={17} className="text-asha-orange flex-shrink-0" />
                        : <Circle size={17} className="text-asha-muted group-hover:text-asha-orange flex-shrink-0 transition-colors" />
                      }
                      <span className={`font-body text-sm font-medium transition-colors ${reg.isRegistered ? 'text-asha-dark' : 'text-asha-muted group-hover:text-asha-dark'}`}>
                        {reg.isRegistered ? 'Registered' : 'Mark as registered'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
