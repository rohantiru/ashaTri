import { useState, useEffect } from 'react'
import { collection, query, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, Clock, MapPin, ExternalLink } from 'lucide-react'

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

  const EventCard = ({ event, dimmed }) => (
    <div className={`bg-white rounded-2xl border border-asha-border p-4 sm:p-5 ${dimmed ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-body font-semibold text-asha-dark mb-2">{event.title}</div>
          <div className="space-y-1">
            <div className="font-body text-sm text-asha-muted flex items-center gap-1.5">
              <Calendar size={13} className="flex-shrink-0" />{fmtDate(event.date)}
            </div>
            <div className="font-body text-sm text-asha-muted flex items-center gap-1.5">
              <Clock size={13} className="flex-shrink-0" />{fmtTime(event.startTime)} – {fmtTime(event.endTime)}
            </div>
            {event.location && (
              <div className="font-body text-sm text-asha-muted flex items-center gap-1.5">
                <MapPin size={13} className="flex-shrink-0" />{event.location}
              </div>
            )}
          </div>
          {event.description && (
            <p className="font-body text-sm text-asha-muted mt-3 pt-3 border-t border-asha-border/50">{event.description}</p>
          )}
        </div>
        {event.calendarLink && (
          <a href={event.calendarLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-asha-border font-body text-xs text-asha-muted hover:border-asha-orange hover:text-asha-orange transition-all flex-shrink-0">
            <ExternalLink size={12} />Calendar
          </a>
        )}
      </div>
    </div>
  )

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-28 animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-asha-dark">Events</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Your upcoming training sessions and team events</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={32} className="text-asha-muted mx-auto mb-3" />
          <p className="font-body text-asha-muted">No events scheduled for you yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-body font-medium text-xs text-asha-muted uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-3">{upcoming.map(e => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="font-body font-medium text-xs text-asha-muted uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-3">{past.map(e => <EventCard key={e.id} event={e} dimmed />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
