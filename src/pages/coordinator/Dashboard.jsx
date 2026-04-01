import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Package, CheckSquare, TrendingUp, Users, ArrowRight, DollarSign, Flag, Calendar, CheckCircle2, MapPin, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { fmtUSD } from '../../utils/format'
import { getCached, setCached } from '../../utils/cache'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

export default function CoordinatorDashboard() {
  const { profile } = useAuth()
  const isCoach = profile?.role === 'coach'
  const isCoordinator = profile?.role === 'coordinator'
  const [swagStats, setSwagStats] = useState({ items: 0, interestItems: 0, inventoryItems: 0, totalResponses: 0, pendingPickup: 0, totalValue: 0 })
  const [raceStats, setRaceStats] = useState({ total: 0, upcoming: 0, participating: 0, confirmed: 0, nextRace: null })
  const [eventStats, setEventStats] = useState({ total: 0, upcoming: 0, nextEvent: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      // races + swagItems are cached — skip those reads when fresh
      let items = getCached('swagItems')
      let races = getCached('races')

      const [responsesSnap, regsSnap, eventsSnap, itemsSnap, racesSnap] = await Promise.all([
        getDocs(collection(db, 'swagResponses')),      // always fresh — athletes order in real time
        getDocs(collection(db, 'raceRegistrations')),  // always fresh
        getDocs(collection(db, 'events')),             // always fresh
        items ? Promise.resolve(null) : getDocs(collection(db, 'swagItems')),
        races ? Promise.resolve(null) : getDocs(collection(db, 'races')),
      ])

      if (itemsSnap) { items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })); setCached('swagItems', items) }
      if (racesSnap) { races = racesSnap.docs.map(d => ({ id: d.id, ...d.data() })); setCached('races', races) }

      // Swag
      const responses = responsesSnap.docs.map(d => d.data())
      const itemPriceMap = {}
      items.forEach(i => { itemPriceMap[i.id] = i.price || 0 })
      const committed = responses.filter(r => ['interested', 'ordered', 'ready', 'picked_up'].includes(r.status))
      const totalValue = committed.reduce((sum, r) => sum + (itemPriceMap[r.itemId] || 0), 0)
      setSwagStats({
        items: items.length,
        interestItems: items.filter(i => i.type === 'interest').length,
        inventoryItems: items.filter(i => i.type === 'inventory').length,
        totalResponses: responses.length,
        pendingPickup: responses.filter(r => r.status === 'ready').length,
        totalValue,
      })

      // Races
      const regs = regsSnap.docs.map(d => d.data())
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const upcomingRaces = races
        .filter(r => r.isActive && r.date && new Date(r.date + 'T00:00:00') >= today)
        .sort((a, b) => a.date > b.date ? 1 : -1)
      const nextRace = upcomingRaces[0] || null
      const uniqueAthletes = new Set(regs.map(r => r.athleteId)).size
      const confirmed = regs.filter(r => r.isRegistered).length
      setRaceStats({
        total: races.filter(r => r.isActive).length,
        upcoming: upcomingRaces.length,
        participating: uniqueAthletes,
        confirmed,
        nextRace,
      })

      // Events
      const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const upcomingEvents = events
        .filter(e => e.date && new Date(e.date + 'T00:00:00') >= today)
        .sort((a, b) => a.date > b.date ? 1 : -1)
      setEventStats({
        total: events.length,
        upcoming: upcomingEvents.length,
        nextEvent: upcomingEvents[0] || null,
      })

      setLoading(false)
    }
    fetchStats()
  }, [])

  const nextDays = raceStats.nextRace ? daysUntil(raceStats.nextRace.date) : null
  const nextEventDays = eventStats.nextEvent ? daysUntil(eventStats.nextEvent.date) : null

  const firstName = profile?.name?.split(' ')[0]
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">

      {/* Greeting */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-xl text-asha-dark">Hey, {firstName}!</h1>
          <a href="/athlete" className="font-body text-[10px] text-asha-muted hover:text-asha-orange transition-colors flex items-center gap-1 mt-0.5">
            <ArrowLeftRight size={9} />
            Switch to athlete view
          </a>
        </div>
        <span className="font-body text-xs text-asha-muted pt-1">{todayStr}</span>
      </div>

      {loading ? (
        <div className="space-y-2 mb-5">
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-16 animate-pulse" />)}
          </div>
          <div className="bg-white rounded-xl border border-asha-border h-12 animate-pulse" />
          <div className="bg-white rounded-xl border border-asha-border h-12 animate-pulse" />
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
          {/* Left column */}
          <div>
            {/* Stats strip */}
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
              {[
                { label: 'UPCOMING RACES', value: String(raceStats.upcoming), color: 'text-asha-dark' },
                { label: 'ATHLETES IN', value: String(raceStats.participating), color: 'text-asha-dark' },
                { label: 'PICKUP PENDING', value: String(swagStats.pendingPickup), color: swagStats.pendingPickup > 0 ? 'text-amber-500' : 'text-asha-dark' },
                { label: 'EVENTS', value: String(eventStats.upcoming), color: 'text-asha-dark' },
                { label: 'PENDING', value: String(swagStats.pendingPickup), color: swagStats.pendingPickup > 0 ? 'text-amber-500' : 'text-asha-dark' },
              ].map(({ label, value, color }, idx) => (
                <div key={label + idx} className={`bg-white rounded-xl border border-asha-border p-3 text-center ${idx >= 3 ? 'hidden lg:block' : ''}`}>
                  <div className={`font-mono font-bold text-2xl leading-none ${color}`}>{value}</div>
                  <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-2">
              <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase mb-2">Quick Actions</h2>
            </div>
            <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50 lg:divide-y-0 lg:grid lg:grid-cols-2 lg:gap-0">
              {[
                { to: '/coord/events', label: 'Manage Events', desc: 'Create events, send calendar invites', icon: Calendar },
                { to: '/coord/races', label: 'Manage Races', desc: 'Add races, dates, registration links', icon: Flag },
                ...(!isCoordinator ? [{ to: '/coord/athletes', label: 'Athletes', desc: 'Organize teams, set race permissions', icon: Users }] : []),
                ...(!isCoach ? [{ to: '/coord/items', label: 'Manage Swag', desc: 'Add items, set prices, update inventory', icon: Package }] : []),
                ...(!isCoach ? [{ to: '/coord/pickup', label: 'Pickups', desc: 'Mark items ready and track collection', icon: CheckSquare }] : []),
              ].map(({ to, label, desc, icon: Icon }) => (
                <Link key={label} to={to} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-asha-cream/50 hover:border-asha-orange/40 hover:shadow-sm transition-colors group border border-transparent lg:border-asha-border/40 lg:rounded-xl lg:m-1">
                  <Icon size={15} className="text-asha-orange flex-shrink-0 group-hover:text-asha-orange" />
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-medium text-sm text-asha-dark">{label}</div>
                    <div className="font-body text-[10px] text-asha-muted">{desc}</div>
                  </div>
                  <ChevronRight size={13} className="text-asha-muted group-hover:text-asha-orange transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:sticky lg:top-8 lg:space-y-4 mt-5 lg:mt-0">
            {/* Next race countdown */}
            {raceStats.nextRace && (
              <Link to="/coord/races" className="block bg-asha-dark rounded-xl p-3.5 mb-3 lg:mb-0 relative overflow-hidden hover:bg-asha-mid transition-colors group">
                <div className="absolute inset-0 bg-gradient-to-br from-asha-orange/15 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-body text-[10px] font-semibold text-asha-orange tracking-widest uppercase mb-0.5">Next Team Race</div>
                    <div className="font-display font-bold text-white text-sm truncate">{raceStats.nextRace.name}</div>
                    <div className="font-body text-[10px] text-asha-muted mt-0.5">
                      {new Date(raceStats.nextRace.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {nextDays !== null && (
                      <div className="text-right">
                        <div className={`font-mono font-bold text-3xl leading-none ${nextDays <= 14 ? 'text-red-400' : nextDays <= 60 ? 'text-amber-400' : 'text-white'}`}>{nextDays}</div>
                        <div className="font-body text-[10px] text-asha-muted">days</div>
                      </div>
                    )}
                    <ChevronRight size={14} className="text-asha-muted group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Link>
            )}

            {/* Next event */}
            {eventStats.nextEvent && (
              <Link to="/coord/events" className="block bg-white rounded-xl border border-asha-border px-3.5 py-3 mb-5 lg:mb-0 hover:border-asha-orange/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-[10px] font-semibold text-asha-muted tracking-widest uppercase mb-0.5">Next Event</div>
                    <div className="font-body font-medium text-sm text-asha-dark truncate">{eventStats.nextEvent.title}</div>
                    <div className="font-body text-[10px] text-asha-muted mt-0.5">
                      {new Date(eventStats.nextEvent.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {eventStats.nextEvent.location && ` · ${eventStats.nextEvent.location}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {nextEventDays !== null && (
                      <span className={`font-mono text-xs font-bold ${nextEventDays <= 7 ? 'text-red-600' : nextEventDays <= 30 ? 'text-amber-600' : 'text-asha-muted'}`}>
                        {nextEventDays === 0 ? 'Today' : `${nextEventDays}d`}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-asha-muted group-hover:text-asha-orange transition-colors" />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
