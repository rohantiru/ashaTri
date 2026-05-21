import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, getDoc, query, where, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth, COORD_ROLES } from '../../contexts/AuthContext'
import { useAppConfig } from '../../contexts/AppConfigContext'
import { fmtUSD } from '../../utils/format'
import { Package, ArrowRight, CheckCircle2, Circle, MapPin, Activity, Trophy, CalendarDays, Shirt, Receipt, ArrowLeftRight } from 'lucide-react'

function fmtDate(dateStr) {
  if (!dateStr) return 'TBD'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

export default function AthleteDashboard() {
  const { user, profile } = useAuth()
  const { config } = useAppConfig()
  const isCoordLike = COORD_ROLES.includes(profile?.role)
  const [myResponses, setMyResponses] = useState([])
  const [itemMap, setItemMap] = useState({})
  const [expenses, setExpenses] = useState([])
  const [myRaceRegs, setMyRaceRegs] = useState([])
  const [raceMap, setRaceMap] = useState({})
  const [myEvents, setMyEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [responsesSnap, expSnap, regsSnap, racesSnap, eventsSnap] = await Promise.all([
        getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid))),
        getDocs(query(collection(db, 'expenses'), where('athleteId', '==', user.uid))),
        getDocs(query(collection(db, 'raceRegistrations'), where('athleteId', '==', user.uid))),
        getDocs(collection(db, 'races')),
        getDocs(query(collection(db, 'events'), where('recipientIds', 'array-contains', user.uid))),
      ])

      const responses = responsesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const itemIds = [...new Set(responses.map(r => r.itemId))]
      const itemDocs = await Promise.all(itemIds.map(id => getDoc(doc(db, 'swagItems', id))))
      const map = {}
      itemDocs.forEach(d => { if (d.exists()) map[d.id] = { id: d.id, ...d.data() } })
      setItemMap(map)
      setMyResponses(responses)

      const exp = expSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      exp.sort((a, b) => (b.date > a.date ? 1 : -1))
      setExpenses(exp)

      const races = {}
      racesSnap.docs.forEach(d => { races[d.id] = { id: d.id, ...d.data() } })
      setRaceMap(races)

      const regs = regsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      regs.sort((a, b) => {
        const ra = races[a.raceId]
        const rb = races[b.raceId]
        if (!ra?.date && !rb?.date) return 0
        if (!ra?.date) return 1
        if (!rb?.date) return -1
        return ra.date > rb.date ? 1 : -1
      })
      setMyRaceRegs(regs)

      const today2 = new Date(); today2.setHours(0, 0, 0, 0)
      const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const upcomingEvents = events
        .filter(e => e.date && new Date(e.date + 'T00:00:00') >= today2)
        .sort((a, b) => a.date > b.date ? 1 : -1)
      setMyEvents(upcomingEvents)

      setLoading(false)
    }
    load()
  }, [user.uid])

  const readyItems = myResponses.filter(r => r.status === 'ready')
  const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  const nextRaceReg = myRaceRegs.find(r => {
    const race = raceMap[r.raceId]
    const days = daysUntil(race?.date)
    return days === null || days >= 0
  })
  const nextRace = nextRaceReg ? raceMap[nextRaceReg.raceId] : null
  const nextRaceDays = nextRace ? daysUntil(nextRace.date) : null

  const firstName = profile?.name?.split(' ')[0]
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  // Build stats
  const stats = []
  if (config.tabs.races) {
    stats.push({
      label: 'DAYS TO RACE',
      value: nextRaceDays !== null ? String(nextRaceDays) : '—',
      color: nextRaceDays !== null && nextRaceDays <= 30 ? 'text-asha-orange' : 'text-asha-dark',
      to: '/athlete/races',
    })
  }
  if (config.tabs.events) {
    stats.push({ label: 'EVENTS', value: String(myEvents.length), color: 'text-asha-dark', to: '/athlete/events' })
  }
  if (config.tabs.races) {
    stats.push({ label: 'RACES', value: String(myRaceRegs.length), color: 'text-asha-dark', to: '/athlete/races' })
  }
  // 4th stat for desktop: gate on tab visibility
  const fourthStat = config.tabs.expenses
    ? { label: 'EXPENSES', value: fmtUSD(expenseTotal), color: 'text-asha-dark', to: '/athlete/expenses' }
    : config.tabs.swag
      ? { label: 'SWAG READY', value: String(readyItems.length), color: readyItems.length > 0 ? 'text-emerald-600' : 'text-asha-dark', to: '/athlete/my-swag' }
      : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">

      {/* Greeting */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-xl text-asha-dark">
            Hey, {firstName}! 🏊🚴🏃
          </h1>
          {isCoordLike && (
            <a href="/coord" className="font-body text-[10px] text-asha-muted hover:text-asha-orange transition-colors flex items-center gap-1 mt-0.5">
              <ArrowLeftRight size={9} />
              Switch to coordinator view
            </a>
          )}
        </div>
        <span className="font-body text-xs text-asha-muted pt-1">{todayStr}</span>
      </div>

      {/* Stats strip */}
      {!loading && (stats.length > 0 || fourthStat) && (
        <div className={`grid gap-2 mb-5 ${
          stats.length === 1 ? 'grid-cols-1' :
          stats.length === 2 ? 'grid-cols-2' :
          'grid-cols-3'
        }${fourthStat ? ' lg:grid-cols-4' : ''}`}>
          {stats.map(({ label, value, color, to }) => (
            to ? (
              <Link key={label} to={to} className="bg-white rounded-xl border border-asha-border p-3 text-center hover:border-asha-orange/40 hover:shadow-sm active:scale-95 transition-all">
                <div className={`font-mono font-bold text-2xl leading-none ${color}`}>{value}</div>
                <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1 leading-tight">{label}</div>
              </Link>
            ) : (
              <div key={label} className="bg-white rounded-xl border border-asha-border p-3 text-center">
                <div className={`font-mono font-bold text-2xl leading-none ${color}`}>{value}</div>
                <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1 leading-tight">{label}</div>
              </div>
            )
          ))}
          {/* 4th stat desktop-only */}
          {fourthStat && (
            fourthStat.to ? (
              <Link to={fourthStat.to} className="hidden lg:block bg-white rounded-xl border border-asha-border p-3 text-center hover:border-asha-orange/40 hover:shadow-sm active:scale-95 transition-all">
                <div className={`font-mono font-bold text-2xl leading-none ${fourthStat.color}`}>{fourthStat.value}</div>
                <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1 leading-tight">{fourthStat.label}</div>
              </Link>
            ) : (
              <div className="hidden lg:block bg-white rounded-xl border border-asha-border p-3 text-center">
                <div className={`font-mono font-bold text-2xl leading-none ${fourthStat.color}`}>{fourthStat.value}</div>
                <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1 leading-tight">{fourthStat.label}</div>
              </div>
            )
          )}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
        {/* Left column */}
        <div>
          {/* Pickup alert */}
          {readyItems.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <Package size={15} className="text-emerald-600 flex-shrink-0" />
              <span className="font-body text-sm text-emerald-800 flex-1 min-w-0">
                {readyItems.length} item{readyItems.length > 1 ? 's' : ''} ready for pickup
              </span>
              <Link to="/athlete/my-swag" className="text-xs font-body font-medium text-emerald-700 flex items-center gap-1 flex-shrink-0">
                View <ArrowRight size={11} />
              </Link>
            </div>
          )}

          {/* Next race countdown */}
          {nextRace && nextRaceDays !== null && nextRaceDays >= 0 && (
            <div className="bg-asha-dark rounded-2xl p-4 mb-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-asha-orange/15 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-body text-[10px] font-semibold text-asha-orange tracking-widest uppercase mb-1">Next Race</div>
                  <div className="font-display font-bold text-white text-sm truncate">{nextRace.name}</div>
                  <div className="font-body text-xs text-asha-muted mt-0.5">
                    {nextRace.location
                      ? <span className="flex items-center gap-1"><MapPin size={9} />{nextRace.location}</span>
                      : fmtDate(nextRace.date)
                    }
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-mono font-bold text-5xl lg:text-7xl text-white leading-none">
                    {nextRaceDays === 0 ? '0' : nextRaceDays}
                  </div>
                  <div className="font-body text-xs text-asha-muted mt-1">
                    {nextRaceDays === 0 ? 'today!' : 'days'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Training Log banner */}
          {config.tabs.training && (!config.trainingMemberIds?.length || config.trainingMemberIds.includes(user.uid)) && <div className="mb-5">
            <Link to="/athlete/training"
              className="flex items-center gap-3 bg-asha-dark rounded-xl px-3.5 py-3 hover:bg-asha-mid transition-colors">
              <Activity size={16} className="text-asha-orange flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-body font-medium text-sm text-white leading-none">Training Log</div>
                <div className="font-body text-[10px] text-asha-muted mt-0.5">Strava activities</div>
              </div>
              <span className="font-body text-[10px] text-asha-orange flex items-center gap-0.5 flex-shrink-0">
                View <ArrowRight size={10} />
              </span>
            </Link>
          </div>}

          {/* Empty state — shown when there's nothing meaningful on the dashboard yet */}
          {!loading && myRaceRegs.length === 0 && myEvents.length === 0 && (() => {
            const features = [
              ...(config.tabs.races    ? [{ icon: Trophy,       label: 'Races',       desc: 'Register for races & track your season', to: '/athlete/races'    }] : []),
              ...(config.tabs.events   ? [{ icon: CalendarDays, label: 'Events',       desc: 'Team events & meetups',                  to: '/athlete/events'   }] : []),
              ...(config.tabs.swag     ? [{ icon: Shirt,        label: 'Browse Swag', desc: 'Order club gear & apparel',              to: '/athlete/browse'   }] : []),
              ...(config.tabs.swag     ? [{ icon: Package,      label: 'My Swag',     desc: 'Check your order & pickup status',       to: '/athlete/my-swag'  }] : []),
              ...(config.tabs.expenses ? [{ icon: Receipt,      label: 'Expenses',    desc: 'Log & track reimbursement requests',     to: '/athlete/expenses' }] : []),
              ...(config.tabs.training && (!config.trainingMemberIds?.length || config.trainingMemberIds.includes(user.uid)) ? [{ icon: Activity, label: 'Training', desc: 'Strava-connected activity log', to: '/athlete/training' }] : []),
            ]
            return (
              <div className="bg-white rounded-2xl border border-asha-border overflow-hidden mb-5">
                <div className="px-4 py-2.5 border-b border-asha-border">
                  <span className="font-body font-semibold text-xs text-asha-muted uppercase tracking-widest">Explore the app</span>
                </div>
                <div className="divide-y divide-asha-border/50">
                  {features.map(({ icon: Icon, label, desc, to }) => (
                    <Link key={label} to={to}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-asha-cream/50 transition-colors group">
                      <Icon size={14} className="text-asha-orange flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-medium text-sm text-asha-dark leading-none">{label}</div>
                        <div className="font-body text-[10px] text-asha-muted mt-0.5">{desc}</div>
                      </div>
                      <ArrowRight size={11} className="text-asha-border group-hover:text-asha-orange transition-colors flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Right column */}
        <div className="lg:sticky lg:top-8 lg:space-y-4">
          {/* Upcoming Races */}
          {!loading && myRaceRegs.length > 0 && config.tabs.races && (
            <div className="mb-5 lg:mb-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Upcoming Races</h2>
                {myRaceRegs.length > 3 && (
                  <Link to="/athlete/races" className="text-[10px] font-body text-asha-orange flex items-center gap-0.5">
                    See all <ArrowRight size={10} />
                  </Link>
                )}
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {myRaceRegs.slice(0, 3).map(reg => {
                  const race = raceMap[reg.raceId]
                  if (!race) return null
                  const days = daysUntil(race.date)
                  const isPast = days !== null && days < 0
                  return (
                    <Link key={reg.id} to="/athlete/races" className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-asha-cream/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-medium text-sm text-asha-dark truncate">{race.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-body text-[10px] text-asha-muted">{fmtDate(race.date)}</span>
                          {reg.event && (
                            <span className="font-body text-[10px] px-1.5 py-px rounded bg-asha-cream text-asha-muted">{reg.event}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isPast && days !== null && (
                          <span className={`font-mono text-xs font-bold ${
                            days <= 14 ? 'text-red-600' :
                            days <= 60 ? 'text-amber-600' :
                            'text-asha-muted'
                          }`}>{days === 0 ? 'Today' : `${days}d`}</span>
                        )}
                        {reg.isRegistered
                          ? <CheckCircle2 size={14} className="text-asha-orange" />
                          : <Circle size={14} className="text-asha-muted" />
                        }
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Team Events */}
          {config.tabs.events && !loading && myEvents.length > 0 && (
            <div className="mb-5 lg:mb-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-body font-semibold text-[10px] text-asha-muted tracking-widest uppercase">Team Events</h2>
                {myEvents.length > 3 && (
                  <Link to="/athlete/events" className="text-[10px] font-body text-asha-orange flex items-center gap-0.5">
                    See all <ArrowRight size={10} />
                  </Link>
                )}
              </div>
              <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
                {myEvents.slice(0, 3).map(event => {
                  const days = daysUntil(event.date)
                  return (
                    <Link key={event.id} to="/athlete/events" className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-asha-cream/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-medium text-sm text-asha-dark truncate">{event.title}</div>
                        <div className="font-body text-[10px] text-asha-muted mt-0.5">
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {event.startTime && ` · ${event.startTime}`}
                          {event.location && ` · ${event.location}`}
                        </div>
                      </div>
                      {days !== null && (
                        <span className={`font-mono text-xs font-bold flex-shrink-0 ${
                          days === 0 ? 'text-asha-orange' :
                          days <= 7 ? 'text-red-600' :
                          days <= 30 ? 'text-amber-600' :
                          'text-asha-muted'
                        }`}>{days === 0 ? 'Today' : `${days}d`}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
