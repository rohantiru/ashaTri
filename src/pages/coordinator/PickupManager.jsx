import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc, serverTimestamp, runTransaction, writeBatch, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import StatusBadge from '../../components/StatusBadge'
import { CheckSquare, Search, Check, Trash2 } from 'lucide-react'
import { fmtUSD } from '../../utils/format'

const FULL_FLOW = ['interested', 'ordered', 'ready', 'picked_up']
const STATUS_LABELS = { interested: 'Interested', ordered: 'Ordered', ready: 'Ready', picked_up: 'Collected' }

function getFlow(itemType) {
  return itemType === 'inventory' ? ['ordered', 'ready', 'picked_up'] : FULL_FLOW
}

export default function PickupManager() {
  const [items, setItems] = useState([])
  const [responses, setResponses] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterItem, setFilterItem] = useState('all')
  const [updating, setUpdating] = useState({})

  const fetchAll = async () => {
    const [itemsSnap, responsesSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'swagItems')),
      getDocs(collection(db, 'swagResponses')),
      getDocs(collection(db, 'users')),
    ])
    setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setResponses(responsesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    const usersMap = {}
    usersSnap.docs.forEach(d => { usersMap[d.id] = d.data() })
    setUsers(usersMap)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const itemMap = {}
  items.forEach(i => { itemMap[i.id] = i })

  const advanceStatus = async (response) => {
    const itemType = itemMap[response.itemId]?.type
    const flow = getFlow(itemType)
    const currentIdx = flow.indexOf(response.status)
    if (currentIdx === -1 || currentIdx === flow.length - 1) return
    const nextStatus = flow[currentIdx + 1]
    setUpdating(u => ({ ...u, [response.id]: true }))
    try {
      const responseRef = doc(db, 'swagResponses', response.id)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(responseRef)
        // Guard: if another coord already advanced this, skip
        if (!snap.exists() || snap.data().status !== response.status) return
        tx.update(responseRef, {
          status: nextStatus,
          [`${nextStatus}At`]: serverTimestamp(),
        })
      })
      setResponses(r => r.map(x => x.id === response.id ? { ...x, status: nextStatus } : x))
    } finally {
      setUpdating(u => ({ ...u, [response.id]: false }))
    }
  }

  const filtered = responses.filter(r => {
    const u = users[r.athleteId]
    const matchSearch = !search || u?.name?.toLowerCase().includes(search.toLowerCase()) || u?.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    const matchItem = filterItem === 'all' || r.itemId === filterItem
    return matchSearch && matchStatus && matchItem
  })

  const clearAllResponses = async () => {
    if (!confirm(`Delete all ${responses.length} orders/interest records? This cannot be undone.`)) return
    const batch = writeBatch(db)
    responses.forEach(r => batch.delete(doc(db, 'swagResponses', r.id)))
    await batch.commit()
    setResponses([])
  }

  const bulkReady = async () => {
    const ordered = filtered.filter(r => r.status === 'ordered')
    if (!ordered.length) return
    if (!confirm(`Mark ${ordered.length} ordered items as ready for pickup?`)) return
    const batch = writeBatch(db)
    ordered.forEach(r => {
      batch.update(doc(db, 'swagResponses', r.id), { status: 'ready', readyAt: serverTimestamp() })
    })
    await batch.commit()
    fetchAll()
  }

  // Status summary — only show statuses relevant to each item type
  const statusCounts = FULL_FLOW.map(s => ({ s, count: responses.filter(r => r.status === s).length }))

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Pickup Manager</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAllResponses}
            className="flex items-center gap-1.5 border border-red-200 text-red-500 px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Clear All
          </button>
          <button
            onClick={bulkReady}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg font-body font-medium text-xs hover:bg-emerald-700 transition-colors"
          >
            Bulk: Mark ordered → Ready
          </button>
        </div>
      </div>

      {/* Status summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {statusCounts.map(({ s, count }) => (
          <div key={s} className="bg-white rounded-xl border border-asha-border p-2.5 text-center">
            <div className="font-mono font-bold text-xl text-asha-dark leading-none">{count}</div>
            <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1">{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 lg:flex lg:items-center lg:gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-asha-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search athlete…"
            className="pl-8 pr-3 py-2 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors w-48"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors bg-white"
        >
          <option value="all">All statuses</option>
          {FULL_FLOW.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          value={filterItem}
          onChange={e => setFilterItem(e.target.value)}
          className="px-3 py-2 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors bg-white"
        >
          <option value="all">All items</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-16 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare size={32} className="text-asha-muted mx-auto mb-3" />
          <p className="font-body text-asha-muted">No responses match your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-asha-border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-asha-cream/60 border-b border-asha-border">
              <tr>
                <th className="font-body font-medium text-xs text-asha-muted text-left px-4 py-3">Athlete</th>
                <th className="font-body font-medium text-xs text-asha-muted text-left px-4 py-3">Item</th>
                <th className="font-body font-medium text-xs text-asha-muted text-left px-4 py-3">Size</th>
                <th className="font-body font-medium text-xs text-asha-muted text-left px-4 py-3">Price</th>
                <th className="font-body font-medium text-xs text-asha-muted text-left px-4 py-3">Status</th>
                <th className="font-body font-medium text-xs text-asha-muted text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const u = users[r.athleteId]
                const item = itemMap[r.itemId]
                const flow = getFlow(item?.type)
                const currentIdx = flow.indexOf(r.status)
                const isLast = currentIdx === flow.length - 1
                const isUpdating = updating[r.id]
                const nextLabel = STATUS_LABELS[flow[currentIdx + 1]]

                return (
                  <tr key={r.id} className="border-b border-asha-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u?.photoURL && <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full" />}
                        <div>
                          <div className="font-body font-medium text-sm text-asha-dark">{u?.name || '—'}</div>
                          <div className="font-body text-xs text-asha-muted">{u?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-body text-sm text-asha-dark">{item?.name || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-sm text-asha-muted">{r.size || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-body text-sm font-medium text-asha-dark">
                        {item?.price != null ? fmtUSD(item?.price) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {isLast ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-body">
                          <Check size={13} /> Done
                        </div>
                      ) : currentIdx === -1 ? (
                        <span className="font-body text-xs text-asha-muted">—</span>
                      ) : (
                        <button
                          onClick={() => advanceStatus(r)}
                          disabled={isUpdating}
                          className="text-xs font-body font-medium px-2.5 py-1 bg-asha-orange text-white rounded-lg hover:bg-asha-orangeLight transition-colors disabled:opacity-50 lg:min-w-[140px]"
                        >
                          {isUpdating ? '…' : `→ ${nextLabel}`}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals footer */}
            <tfoot className="bg-asha-cream/40 border-t border-asha-border">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-body font-semibold text-sm text-asha-dark">
                  Total ({filtered.length} orders)
                </td>
                <td className="px-4 py-3 font-body font-bold text-sm text-asha-orange">
                  {fmtUSD(filtered.reduce((sum, r) => sum + (itemMap[r.itemId]?.price || 0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
