import { useState, useEffect } from 'react'
import { collection, query, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, ExternalLink } from 'lucide-react'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function AthleteEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'events'))
      const mine = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.recipientIds?.includes(user.uid))
        .sort((a, b) => a.date > b.date ? 1 : -1)
      setEvents(mine)
      setLoading(false)
    }
    load()
  }, [user.uid])

  const now = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter(e => e.date >= now)
  const past = events.filter(e => e.date < now)

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-2">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-12 animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Events</h1>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={24} className="text-asha-muted mx-auto mb-2" />
          <p className="font-body text-sm text-asha-muted">No events scheduled for you yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Upcoming</h2>
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {upcoming.map(event => (
                  <div key={event.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-medium text-sm text-asha-dark">{event.title}</div>
                      <div className="font-body text-[10px] text-asha-muted mt-0.5">
                        {fmtDate(event.date)} · {fmtTime(event.startTime)}–{fmtTime(event.endTime)}
                        {event.location && ` · ${event.location}`}
                      </div>
                      {event.description && (
                        <div className="font-body text-xs text-asha-muted mt-1 line-clamp-2">{event.description}</div>
                      )}
                    </div>
                    {event.calendarLink && (
                      <a href={event.calendarLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-body text-asha-orange flex-shrink-0">
                        <ExternalLink size={10} />Add
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Past</h2>
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50 opacity-50">
                {past.map(event => (
                  <div key={event.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-medium text-sm text-asha-dark">{event.title}</div>
                      <div className="font-body text-[10px] text-asha-muted mt-0.5">
                        {fmtDate(event.date)} · {fmtTime(event.startTime)}–{fmtTime(event.endTime)}
                        {event.location && ` · ${event.location}`}
                      </div>
                      {event.description && (
                        <div className="font-body text-xs text-asha-muted mt-1 line-clamp-2">{event.description}</div>
                      )}
                    </div>
                    {event.calendarLink && (
                      <a href={event.calendarLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-body text-asha-orange flex-shrink-0">
                        <ExternalLink size={10} />Add
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
