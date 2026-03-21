import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { fmtUSD } from '../../utils/format'
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react'

const CATEGORIES = ['Travel', 'Entry Fee', 'Equipment', 'Accommodation', 'Food', 'Other']

export default function ExpensesSummary() {
  const [expenses, setExpenses] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    async function load() {
      const [expSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'users')),
      ])
      setExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      const usersMap = {}
      usersSnap.docs.forEach(d => { usersMap[d.id] = d.data() })
      setUsers(usersMap)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory)
  const grandTotal = filtered.reduce((sum, e) => sum + (e.amount || 0), 0)

  // Group by category
  const byCategory = {}
  filtered.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })

  // Group by athlete
  const byAthlete = {}
  filtered.forEach(e => {
    if (!byAthlete[e.athleteId]) byAthlete[e.athleteId] = { total: 0, items: [] }
    byAthlete[e.athleteId].total += e.amount || 0
    byAthlete[e.athleteId].items.push(e)
  })
  // Sort athletes by total desc
  const athleteEntries = Object.entries(byAthlete).sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-asha-dark">Expenses Summary</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Team expense overview submitted by athletes</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-16 animate-pulse" />)}</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={32} className="text-asha-muted mx-auto mb-3" />
          <p className="font-body text-asha-muted">No expenses submitted yet</p>
        </div>
      ) : (
        <>
          {/* Grand total + category breakdown */}
          <div className="bg-white rounded-2xl border border-asha-border p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-semibold text-asha-dark">Total</span>
              <span className="font-display font-bold text-2xl text-asha-orange">{fmtUSD(grandTotal)}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map(cat => (
                <div key={cat} className="text-center p-2 bg-asha-cream rounded-xl">
                  <div className="font-body font-semibold text-sm text-asha-dark">{fmtUSD(byCategory[cat] || 0)}</div>
                  <div className="font-body text-xs text-asha-muted mt-0.5">{cat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {['all', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-body font-medium text-xs transition-all ${filterCategory === cat ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
              >
                {cat === 'all' ? `All (${expenses.length})` : cat}
              </button>
            ))}
          </div>

          {/* Per-athlete breakdown */}
          <div className="space-y-3">
            {athleteEntries.map(([athleteId, { total, items }]) => {
              const u = users[athleteId]
              const isOpen = expanded[athleteId]
              const athleteItems = filterCategory === 'all' ? items : items.filter(e => e.category === filterCategory)
              if (athleteItems.length === 0) return null
              const athleteTotal = athleteItems.reduce((s, e) => s + (e.amount || 0), 0)
              return (
                <div key={athleteId} className="bg-white rounded-2xl border border-asha-border overflow-hidden">
                  <button
                    onClick={() => setExpanded(ex => ({ ...ex, [athleteId]: !ex[athleteId] }))}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    {u?.photoURL && <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-medium text-sm text-asha-dark">{u?.name || athleteId}</div>
                      <div className="font-body text-xs text-asha-muted">{athleteItems.length} expense{athleteItems.length !== 1 ? 's' : ''}</div>
                    </div>
                    <span className="font-display font-bold text-asha-orange">{fmtUSD(athleteTotal)}</span>
                    {isOpen ? <ChevronUp size={16} className="text-asha-muted" /> : <ChevronDown size={16} className="text-asha-muted" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-asha-border">
                      {athleteItems.sort((a, b) => b.date > a.date ? 1 : -1).map(e => (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-asha-border/40 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-sm text-asha-dark">{e.title}</div>
                            <div className="font-body text-xs text-asha-muted">{e.date} · {e.category}</div>
                            {e.notes && <div className="font-body text-xs text-asha-muted truncate">{e.notes}</div>}
                          </div>
                          <span className="font-body font-semibold text-sm text-asha-dark flex-shrink-0">{fmtUSD(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
