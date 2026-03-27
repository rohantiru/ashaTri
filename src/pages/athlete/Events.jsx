import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, ExternalLink, List, ChevronLeft, ChevronRight } from 'lucide-react'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtDateShort(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function EventCard({ event, dimmed = false }) {
  return (
    <div className={`flex items-center gap-3 px-3.5 py-3 ${dimmed ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="font-body font-medium text-sm text-asha-dark">{event.title}</div>
        <div className="font-body text-[10px] text-asha-muted mt-0.5">
          {fmtDate(event.date)}
          {event.startTime && ` · ${fmtTime(event.startTime)}`}
          {event.endTime && `–${fmtTime(event.endTime)}`}
          {event.location && ` · ${event.location}`}
        </div>
        {event.description && (
          <div className="font-body text-xs text-asha-muted mt-1 line-clamp-2">{event.description}</div>
        )}
      </div>
      {event.calendarLink && (
        <a href={event.calendarLink} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-asha-orange">
          <span className="flex items-center gap-1 text-[10px] font-body lg:hidden">
            <ExternalLink size={10} />Add
          </span>
          <span className="hidden lg:inline-flex lg:items-center lg:gap-1 text-xs font-body font-medium">
            <ExternalLink size={11} />Add to calendar
          </span>
        </a>
      )}
    </div>
  )
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function MonthCalendar({ events, calMonth, setCalMonth, selectedDay, setSelectedDay }) {
  const { year, month } = calMonth
  const todayStr = new Date().toISOString().slice(0, 10)

  // Build event date set for dot rendering
  const eventDates = new Set(events.map(e => e.date))

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  // Pad to full weeks
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDow + 1
    if (dayNum < 1 || dayNum > daysInMonth) return null
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(dayNum).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  })

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    setSelectedDay(null)
    setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })
  }
  const nextMonth = () => {
    setSelectedDay(null)
    setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })
  }

  const dayEvents = selectedDay ? events.filter(e => e.date === selectedDay) : []

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-asha-cream transition-colors text-asha-muted hover:text-asha-dark">
          <ChevronLeft size={16} />
        </button>
        <span className="font-body font-semibold text-sm text-asha-dark">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-asha-cream transition-colors text-asha-muted hover:text-asha-dark">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center font-body text-[10px] text-asha-muted uppercase tracking-widest py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDay
          const hasEvent = eventDates.has(dateStr)
          const isPast = dateStr < todayStr
          const dayNum = parseInt(dateStr.slice(8), 10)

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              disabled={!hasEvent}
              className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all ${
                isSelected
                  ? 'bg-asha-dark'
                  : isToday
                  ? 'bg-asha-orangeDim'
                  : hasEvent
                  ? 'hover:bg-asha-cream'
                  : ''
              } ${!hasEvent ? 'cursor-default' : ''}`}
            >
              <span className={`font-body text-xs leading-none ${
                isSelected ? 'text-white font-semibold'
                : isToday ? 'text-asha-orange font-semibold'
                : isPast ? 'text-asha-muted/60'
                : hasEvent ? 'text-asha-dark font-medium'
                : 'text-asha-muted/50'
              }`}>
                {dayNum}
              </span>
              {hasEvent && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-asha-orange' : 'bg-asha-orange'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="mt-4">
          <div className="font-body text-[10px] text-asha-muted uppercase tracking-widest mb-2">
            {fmtDateShort(selectedDay)}
          </div>
          <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
            {dayEvents.length > 0
              ? dayEvents.map(e => <EventCard key={e.id} event={e} />)
              : <div className="px-4 py-3 font-body text-sm text-asha-muted">No events this day</div>
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default function AthleteEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list')
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState(null)

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
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-2">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-12 animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Events</h1>
        {events.length > 0 && (
          <div className="flex items-center gap-0.5 bg-white border border-asha-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-asha-dark text-white' : 'text-asha-muted hover:text-asha-dark'}`}
              title="List view"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-asha-dark text-white' : 'text-asha-muted hover:text-asha-dark'}`}
              title="Calendar view"
            >
              <Calendar size={14} />
            </button>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={24} className="text-asha-muted mx-auto mb-2" />
          <p className="font-body text-sm text-asha-muted">No events scheduled for you yet</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
          <div className="bg-white rounded-xl border border-asha-border p-4">
            <MonthCalendar
              events={events}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
            />
          </div>
          {/* Desktop right rail: upcoming list */}
          <div className="hidden lg:block lg:sticky lg:top-8">
            <div className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase mb-2">Upcoming</div>
            <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
              {upcoming.length > 0
                ? upcoming.map(e => <EventCard key={e.id} event={e} />)
                : <div className="px-4 py-3 font-body text-sm text-asha-muted">None upcoming</div>
              }
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-5 lg:space-y-0">
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Upcoming</h2>
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {upcoming.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Past</h2>
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {past.map(event => <EventCard key={event.id} event={event} dimmed />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
