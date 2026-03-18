import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, getDoc, query, where, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useAppConfig } from '../../contexts/AppConfigContext'
import { fmtUSD } from '../../utils/format'
import StatusBadge from '../../components/StatusBadge'
import { ShoppingBag, Flag, Receipt, ArrowRight, Package, Calendar, CheckCircle2, Circle, ExternalLink } from 'lucide-react'

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
  const [myResponses, setMyResponses] = useState([])
  const [itemMap, setItemMap] = useState({})
  const [expenses, setExpenses] = useState([])
  const [myRaceRegs, setMyRaceRegs] = useState([])
  const [raceMap, setRaceMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [responsesSnap, expSnap, regsSnap, racesSnap] = await Promise.all([
        getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid))),
        getDocs(query(collection(db, 'expenses'), where('athleteId', '==', user.uid))),
        getDocs(query(collection(db, 'raceRegistrations'), where('athleteId', '==', user.uid))),
        getDocs(collection(db, 'races')),
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
      // Sort: upcoming first (with date), then TBD
      regs.sort((a, b) => {
        const ra = races[a.raceId]
        const rb = races[b.raceId]
        if (!ra?.date && !rb?.date) return 0
        if (!ra?.date) return 1
        if (!rb?.date) return -1
        return ra.date > rb.date ? 1 : -1
      })
      setMyRaceRegs(regs)

      setLoading(false)
    }
    load()
  }, [user.uid])

  const readyItems = myResponses.filter(r => r.status === 'ready')
  const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // Next upcoming race
  const nextRaceReg = myRaceRegs.find(r => {
    const race = raceMap[r.raceId]
    const days = daysUntil(race?.date)
    return days === null || days >= 0
  })
  const nextRace = nextRaceReg ? raceMap[nextRaceReg.raceId] : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Greeting */}
      <div className="mb-6 sm:mb-8">
        <p className="font-body text-asha-muted text-sm mb-1">Welcome back</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-asha-dark">{profile?.name?.split(' ')[0]} 👋</h1>
      </div>

      {/* Pickup alert */}
      {readyItems.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-emerald-800 text-sm">
              {readyItems.length} item{readyItems.length > 1 ? 's' : ''} ready for pickup!
            </div>
            <div className="font-body text-xs text-emerald-700 mt-0.5">Your coordinator has your swag ready to collect.</div>
          </div>
          <Link to="/athlete/my-swag" className="text-xs font-body font-medium text-emerald-700 hover:text-emerald-900 flex items-center gap-1 flex-shrink-0">
            View <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Quick links — Swag · Races · Expenses */}
      <div className={`grid gap-3 mb-6 ${
        config.tabs.swag && config.tabs.expenses ? 'grid-cols-1 sm:grid-cols-3' :
        config.tabs.swag || config.tabs.expenses ? 'grid-cols-1 sm:grid-cols-2' :
        'grid-cols-1'
      }`}>
        {config.tabs.swag && (
          <Link to="/athlete/browse" className="bg-asha-orange rounded-2xl p-5 hover:bg-asha-orangeLight transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div className="font-display font-bold text-white text-base sm:text-lg">Swag</div>
            <div className="font-body text-white/80 text-sm mt-1">Browse items and track orders</div>
            <div className="font-body text-white/70 text-xs mt-3">
              {myResponses.length > 0 ? `${myResponses.length} item${myResponses.length !== 1 ? 's' : ''} requested` : "Explore what's available"}
            </div>
          </Link>
        )}

        <Link to="/athlete/races" className="bg-white border border-asha-border rounded-2xl p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-xl bg-asha-orangeDim flex items-center justify-center mb-3">
            <Flag size={20} className="text-asha-orange" />
          </div>
          <div className="font-display font-bold text-asha-dark text-base sm:text-lg">Races</div>
          <div className="font-body text-asha-muted text-sm mt-1">Select events and track registration</div>
          <div className="font-body text-xs text-asha-muted mt-3">
            {myRaceRegs.length > 0
              ? `${myRaceRegs.length} race${myRaceRegs.length !== 1 ? 's' : ''} selected`
              : 'View upcoming races'}
          </div>
        </Link>

        {config.tabs.expenses && (
          <Link to="/athlete/expenses" className="bg-white border border-asha-border rounded-2xl p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-xl bg-asha-orangeDim flex items-center justify-center mb-3">
              <Receipt size={20} className="text-asha-orange" />
            </div>
            <div className="font-display font-bold text-asha-dark text-base sm:text-lg">Expenses</div>
            <div className="font-body text-asha-muted text-sm mt-1">Submit for reimbursement</div>
            <div className="font-body text-xs text-asha-orange font-semibold mt-3">
              {expenses.length > 0 ? `${fmtUSD(expenseTotal)} submitted` : 'No expenses yet'}
            </div>
          </Link>
        )}
      </div>

      {/* My Races widget */}
      {!loading && myRaceRegs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-base sm:text-lg text-asha-dark">My Races</h2>
            {myRaceRegs.length > 3 && (
              <Link to="/athlete/races" className="text-xs font-body text-asha-orange hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {myRaceRegs.slice(0, 3).map(reg => {
              const race = raceMap[reg.raceId]
              if (!race) return null
              const days = daysUntil(race.date)
              const isPast = days !== null && days < 0
              return (
                <div key={reg.id} className="bg-white rounded-2xl border border-asha-border flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                    <Flag size={14} className="text-asha-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-medium text-sm text-asha-dark truncate">{race.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-body text-xs text-asha-muted flex items-center gap-1">
                        <Calendar size={10} />{fmtDate(race.date)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-asha-cream font-body text-xs text-asha-muted">{reg.event}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isPast && days !== null && (
                      <span className={`text-xs font-body font-medium px-2 py-1 rounded-lg ${
                        days <= 14 ? 'bg-red-50 text-red-600' :
                        days <= 60 ? 'bg-amber-50 text-amber-600' :
                        'bg-asha-cream text-asha-muted'
                      }`}>
                        {days === 0 ? 'Today!' : `${days}d`}
                      </span>
                    )}
                    {reg.isRegistered
                      ? <CheckCircle2 size={16} className="text-asha-orange" />
                      : <Circle size={16} className="text-asha-muted" />
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expenses widget */}
      {config.tabs.expenses && !loading && expenses.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-base sm:text-lg text-asha-dark">Pending Reimbursement</h2>
            <Link to="/athlete/expenses" className="text-xs font-body text-asha-orange hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-asha-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-asha-border/50">
              <span className="font-body text-sm text-asha-muted">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} submitted</span>
              <span className="font-display font-bold text-asha-orange">{fmtUSD(expenseTotal)}</span>
            </div>
            {expenses.slice(0, 3).map((e, i) => (
              <div key={e.id} className={`flex items-center gap-3 px-4 py-2.5 ${i < Math.min(expenses.length, 3) - 1 ? 'border-b border-asha-border/30' : ''}`}>
                <div className="w-7 h-7 rounded-lg bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                  <Receipt size={12} className="text-asha-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm text-asha-dark truncate">{e.title}</div>
                  <div className="font-body text-xs text-asha-muted">{e.date} · {e.category}</div>
                </div>
                <span className="font-body text-sm font-medium text-asha-dark flex-shrink-0">{fmtUSD(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent swag activity */}
      {config.tabs.swag && !loading && myResponses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-base sm:text-lg text-asha-dark">Recent Swag</h2>
            {myResponses.length > 4 && (
              <Link to="/athlete/my-swag" className="text-xs font-body text-asha-orange hover:underline flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {myResponses.slice(0, 4).map(r => {
              const item = itemMap[r.itemId]
              return (
                <div key={r.id} className="bg-white rounded-xl border border-asha-border flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-asha-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-medium text-sm text-asha-dark truncate">{item?.name || '—'}</div>
                    {r.size && <div className="font-body text-xs text-asha-muted">Size: {r.size}</div>}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
