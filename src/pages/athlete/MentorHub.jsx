import { useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Activity, Bike, Waves, Shield } from 'lucide-react'

const SESSIONS = [
  { key: 'tuesdayTrack', label: 'Tuesday Track',      icon: Activity, color: '#FC4C02', bg: '#FFF3EE' },
  { key: 'weekendSwim',  label: 'Weekend Swim (SUP)', icon: Waves,    color: '#2563EB', bg: '#EFF6FF' },
  { key: 'bikeRide',     label: 'Weekend Bike Ride',  icon: Bike,     color: '#16A34A', bg: '#F0FDF4' },
]

function getCurrentWeekStart() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtWeekDate(weekStartStr) {
  return new Date(weekStartStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const currentWeek = getCurrentWeekStart()

export default function MentorHub() {
  const { user } = useAuth()

  const [myAvailability, setMyAvailability] = useState({
    tuesdayTrack: false,
    weekendSwim: false,
    bikeRide: false,
  })
  const [saving, setSaving] = useState(false)
  const [allMentors, setAllMentors] = useState([])
  const [loadingMentors, setLoadingMentors] = useState(true)

  useEffect(() => {
    async function load() {
      // Load own availability
      const mySnap = await getDoc(doc(db, 'mentorAvailability', user.uid))
      if (mySnap.exists()) {
        const data = mySnap.data()
        if (data.weekStart === currentWeek) {
          setMyAvailability({
            tuesdayTrack: data.tuesdayTrack ?? false,
            weekendSwim:  data.weekendSwim  ?? false,
            bikeRide:     data.bikeRide     ?? false,
          })
        }
      }

      // Load all mentor users, then their availability
      const usersSnap = await getDocs(query(collection(db, 'users'), where('isMentor', '==', true)))
      let mentorUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }))

      // Current user may have role-based access (e.g. owner) without isMentor flag
      if (!mentorUsers.some(m => m.uid === user.uid)) {
        const myUserSnap = await getDoc(doc(db, 'users', user.uid))
        if (myUserSnap.exists()) {
          mentorUsers = [...mentorUsers, { uid: user.uid, ...myUserSnap.data() }]
        }
      }

      const availDocs = await Promise.all(
        mentorUsers.map(m => getDoc(doc(db, 'mentorAvailability', m.uid)))
      )

      const combined = mentorUsers.map((m, i) => {
        const avail = availDocs[i].exists() ? availDocs[i].data() : null
        const isCurrentWeek = avail?.weekStart === currentWeek
        return {
          uid: m.uid,
          name: m.name,
          photoURL: m.photoURL,
          tuesdayTrack: isCurrentWeek ? (avail.tuesdayTrack ?? false) : false,
          weekendSwim:  isCurrentWeek ? (avail.weekendSwim  ?? false) : false,
          bikeRide:     isCurrentWeek ? (avail.bikeRide     ?? false) : false,
        }
      })
      setAllMentors(combined)
      setLoadingMentors(false)
    }
    load()
  }, [user.uid])

  const handleToggle = async (sessionKey) => {
    const newValue = !myAvailability[sessionKey]
    const updated = { ...myAvailability, [sessionKey]: newValue }
    setMyAvailability(updated)
    setAllMentors(prev => prev.map(m => m.uid === user.uid ? { ...m, [sessionKey]: newValue } : m))

    setSaving(true)
    await setDoc(doc(db, 'mentorAvailability', user.uid), {
      weekStart:    currentWeek,
      tuesdayTrack: updated.tuesdayTrack,
      weekendSwim:  updated.weekendSwim,
      bikeRide:     updated.bikeRide,
      updatedAt:    serverTimestamp(),
    })
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-asha-cream pb-24 sm:pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6">

        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-teal-600" />
            <h1 className="font-display font-bold text-xl text-asha-dark">Mentor Hub</h1>
          </div>
          <p className="font-body text-sm text-asha-muted">
            Let the team know which sessions you can lead this week.
          </p>
          <p className="font-body text-xs text-asha-muted mt-0.5">
            Week of {fmtWeekDate(currentWeek)}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">

          {/* ── My Availability ── */}
          <div className="bg-asha-card rounded-2xl border border-asha-border overflow-hidden mb-5 lg:mb-0">
            <div className="px-4 py-3 border-b border-asha-border">
              <span className="font-display font-semibold text-sm text-asha-dark">My Availability</span>
            </div>
            <div className="divide-y divide-asha-border/50">
              {SESSIONS.map(({ key, label, icon: Icon, color, bg }) => {
                const active = myAvailability[key]
                return (
                  <button
                    key={key}
                    onClick={() => handleToggle(key)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-asha-cream transition-colors min-h-[52px] disabled:opacity-60 text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ backgroundColor: active ? bg : '#F5F0EB' }}
                    >
                      <Icon size={16} style={{ color: active ? color : '#8C7B6B' }} />
                    </div>
                    <span className="font-body font-medium text-sm text-asha-dark flex-1">{label}</span>
                    {/* Toggle pill */}
                    <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${active ? 'bg-asha-orange' : 'bg-asha-border'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${active ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Who's In This Week ── */}
          <div className="lg:sticky lg:top-8">
            <div className="font-body text-[10px] font-semibold text-asha-muted tracking-widest uppercase px-1 mb-2">
              Who's In This Week
            </div>
            <div className="space-y-3">
              {loadingMentors ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-asha-card rounded-2xl border border-asha-border h-16 animate-pulse" />
                ))
              ) : (
                SESSIONS.map(({ key, label, icon: Icon, color }) => {
                  const opted = allMentors.filter(m => m[key])
                  return (
                    <div key={key} className="bg-asha-card rounded-2xl border border-asha-border overflow-hidden">
                      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-asha-border/60">
                        <Icon size={13} style={{ color }} />
                        <span className="font-body font-semibold text-xs text-asha-dark flex-1">{label}</span>
                        <span className="font-mono text-xs text-asha-muted">{opted.length}</span>
                      </div>
                      {opted.length === 0 ? (
                        <div className="px-4 py-3 font-body text-xs text-asha-muted italic">No mentors yet</div>
                      ) : (
                        <div className="divide-y divide-asha-border/40">
                          {opted.map(m => (
                            <div key={m.uid} className="flex items-center gap-2.5 px-4 py-2.5">
                              {m.photoURL ? (
                                <img src={m.photoURL} alt={m.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                                  <span className="font-display font-bold text-asha-orange text-[9px] leading-none">
                                    {m.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                                  </span>
                                </div>
                              )}
                              <span className="font-body text-sm text-asha-dark flex-1">{m.name}</span>
                              {m.uid === user.uid && (
                                <span className="text-[10px] font-body text-asha-muted bg-gray-100 px-1.5 py-0.5 rounded">you</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
