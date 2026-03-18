import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Package, BarChart2, CheckSquare, TrendingUp, Users, ArrowRight, DollarSign, Flag, Calendar, CheckCircle2 } from 'lucide-react'
import { fmtUSD } from '../../utils/format'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

export default function CoordinatorDashboard() {
  const { profile } = useAuth()
  const [swagStats, setSwagStats] = useState({ items: 0, interestItems: 0, inventoryItems: 0, totalResponses: 0, pendingPickup: 0, totalValue: 0 })
  const [raceStats, setRaceStats] = useState({ total: 0, upcoming: 0, participating: 0, confirmed: 0, nextRace: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [itemsSnap, responsesSnap, racesSnap, regsSnap] = await Promise.all([
        getDocs(collection(db, 'swagItems')),
        getDocs(collection(db, 'swagResponses')),
        getDocs(collection(db, 'races')),
        getDocs(collection(db, 'raceRegistrations')),
      ])

      // Swag
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
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
      const races = racesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
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

      setLoading(false)
    }
    fetchStats()
  }, [])

  const nextDays = raceStats.nextRace ? daysUntil(raceStats.nextRace.date) : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="font-body text-asha-muted text-sm mb-1">Welcome back, {profile?.name?.split(' ')[0]}</p>
        <h1 className="font-display font-bold text-3xl text-asha-dark">Coordinator Overview</h1>
      </div>

      {loading ? (
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border p-5 animate-pulse h-28" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Next race banner */}
          {raceStats.nextRace && (
            <Link to="/coord/races" className="block bg-asha-dark rounded-2xl p-5 mb-6 hover:bg-asha-mid transition-colors group">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-asha-orange/20 flex items-center justify-center flex-shrink-0">
                    <Flag size={18} className="text-asha-orange" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-asha-muted uppercase tracking-wide mb-0.5">Next Team Race</p>
                    <p className="font-display font-bold text-white">{raceStats.nextRace.name}</p>
                    <p className="font-body text-xs text-asha-muted flex items-center gap-1 mt-0.5">
                      <Calendar size={11} />
                      {new Date(raceStats.nextRace.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {nextDays !== null && (
                    <div className={`text-center px-4 py-2 rounded-xl ${nextDays <= 14 ? 'bg-red-500/20' : nextDays <= 60 ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                      <div className={`font-display font-bold text-2xl leading-tight ${nextDays <= 14 ? 'text-red-400' : nextDays <= 60 ? 'text-amber-400' : 'text-white'}`}>{nextDays}</div>
                      <div className="font-body text-xs text-asha-muted">days away</div>
                    </div>
                  )}
                  <ArrowRight size={16} className="text-asha-muted group-hover:text-white transition-colors hidden sm:block" />
                </div>
              </div>
            </Link>
          )}

          {/* Race stats */}
          <h2 className="font-display font-semibold text-base text-asha-dark mb-3">Races</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Races', value: raceStats.total, sub: `${raceStats.upcoming} upcoming`, icon: Flag, to: '/coord/races', color: 'bg-blue-50 text-blue-600' },
              { label: 'Upcoming', value: raceStats.upcoming, sub: 'with a date set', icon: Calendar, to: '/coord/races', color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Athletes In', value: raceStats.participating, sub: 'selected a race', icon: Users, to: '/coord/races', color: 'bg-purple-50 text-purple-600' },
              { label: 'Confirmed', value: raceStats.confirmed, sub: 'registered for race', icon: CheckCircle2, to: '/coord/races', color: 'bg-emerald-50 text-emerald-600' },
            ].map(({ label, value, sub, icon: Icon, to, color }) => (
              <Link key={label} to={to} className="bg-white rounded-2xl border border-asha-border p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}><Icon size={16} /></div>
                <div className="font-display font-bold text-2xl text-asha-dark">{value}</div>
                <div className="font-body font-medium text-sm text-asha-dark mt-0.5">{label}</div>
                <div className="font-body text-xs text-asha-muted mt-0.5">{sub}</div>
              </Link>
            ))}
          </div>

          {/* Swag stats */}
          <h2 className="font-display font-semibold text-base text-asha-dark mb-3">Swag</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Swag Items', value: swagStats.items, sub: `${swagStats.interestItems} interest · ${swagStats.inventoryItems} inventory`, icon: Package, to: '/coord/items', color: 'bg-blue-50 text-blue-600' },
              { label: 'Total Responses', value: swagStats.totalResponses, sub: 'across all items', icon: TrendingUp, to: '/coord/interest', color: 'bg-purple-50 text-purple-600' },
              { label: 'Awaiting Pickup', value: swagStats.pendingPickup, sub: 'ready to collect', icon: CheckSquare, to: '/coord/pickup', color: 'bg-amber-50 text-amber-600' },
              { label: 'Orders Value', value: fmtUSD(swagStats.totalValue), sub: 'committed orders', icon: DollarSign, to: '/coord/interest', color: 'bg-emerald-50 text-emerald-600' },
            ].map(({ label, value, sub, icon: Icon, to, color }) => (
              <Link key={label} to={to} className="bg-white rounded-2xl border border-asha-border p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}><Icon size={16} /></div>
                <div className="font-display font-bold text-2xl text-asha-dark">{value}</div>
                <div className="font-body font-medium text-sm text-asha-dark mt-0.5">{label}</div>
                <div className="font-body text-xs text-asha-muted mt-0.5">{sub}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <h2 className="font-display font-semibold text-lg text-asha-dark mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { to: '/coord/races', label: 'Manage Races', desc: 'Add races, set dates, registration links and coupon codes', icon: Flag },
          { to: '/coord/races', label: 'Athlete Permissions', desc: 'Control which races each athlete can see and enter', icon: Users },
          { to: '/coord/items', label: 'Manage Swag Items', desc: 'Add items, set prices, update inventory', icon: Package },
          { to: '/coord/interest', label: 'View Interest & Orders', desc: 'See who wants what and total committed value', icon: BarChart2 },
          { to: '/coord/pickup', label: 'Manage Pickups', desc: 'Mark items as ready and track collection', icon: CheckSquare },
        ].map(({ to, label, desc, icon: Icon }) => (
          <Link key={label} to={to} className="bg-white rounded-2xl border border-asha-border p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-asha-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-asha-dark text-sm">{label}</div>
              <div className="font-body text-xs text-asha-muted mt-0.5 leading-relaxed">{desc}</div>
            </div>
            <ArrowRight size={14} className="text-asha-muted group-hover:text-asha-orange transition-colors flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
