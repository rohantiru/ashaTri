import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import StatusBadge from '../../components/StatusBadge'
import { BarChart2, ChevronDown, ChevronUp, Users, DollarSign } from 'lucide-react'

export default function InterestView() {
  const [items, setItems] = useState([])
  const [responses, setResponses] = useState([])
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    async function load() {
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
    load()
  }, [])

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  // Group responses by item
  const responsesByItem = {}
  responses.forEach(r => {
    if (!responsesByItem[r.itemId]) responsesByItem[r.itemId] = []
    responsesByItem[r.itemId].push(r)
  })

  const COMMITTED = ['interested', 'ordered', 'ready', 'picked_up']

  // Grand totals
  const grandTotal = items.reduce((sum, item) => {
    const itemResponses = responsesByItem[item.id] || []
    const committed = itemResponses.filter(r => COMMITTED.includes(r.status)).length
    return sum + committed * (item.price || 0)
  }, 0)

  // Separate interest polls vs inventory
  const interestItems = items.filter(i => i.type === 'interest')
  const inventoryItems = items.filter(i => i.type === 'inventory')

  const renderItem = (item) => {
    const itemResponses = responsesByItem[item.id] || []
    const isOpen = expanded[item.id]
    const committedCount = itemResponses.filter(r => COMMITTED.includes(r.status)).length
    const committedValue = committedCount * (item.price || 0)

    const bySizeStatus = {}
    itemResponses.forEach(r => {
      const key = r.size || 'One Size'
      if (!bySizeStatus[key]) bySizeStatus[key] = { interested: 0, ordered: 0, ready: 0, picked_up: 0 }
      bySizeStatus[key][r.status] = (bySizeStatus[key][r.status] || 0) + 1
    })

    return (
      <div key={item.id} className="bg-white rounded-2xl border border-asha-border overflow-hidden">
        <button
          onClick={() => toggle(item.id)}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-semibold text-asha-dark">{item.name}</span>
              <StatusBadge status={item.type} />
              {item.price != null && (
                <span className="font-body text-xs text-asha-orange font-semibold">${item.price.toFixed(2)} ea</span>
              )}
            </div>
            <div className="font-body text-xs text-asha-muted mt-0.5">
              {itemResponses.length} response{itemResponses.length !== 1 ? 's' : ''}
              {committedValue > 0 && <span className="ml-2 text-asha-orange font-medium">${committedValue.toFixed(2)} committed</span>}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {Object.entries(bySizeStatus).map(([size, counts]) => (
              <div key={size} className="text-center">
                <div className="font-display font-bold text-sm text-asha-dark">{Object.values(counts).reduce((a,b) => a+b, 0)}</div>
                <div className="font-body text-xs text-asha-muted">{size}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-asha-orangeDim px-2.5 py-1 rounded-full">
              <Users size={12} className="text-asha-orange" />
              <span className="font-body font-medium text-xs text-asha-orange">{itemResponses.length}</span>
            </div>
            {isOpen ? <ChevronUp size={16} className="text-asha-muted" /> : <ChevronDown size={16} className="text-asha-muted" />}
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-asha-border">
            {Object.keys(bySizeStatus).length > 0 && (
              <div className="p-4 border-b border-asha-border">
                <h4 className="font-display font-semibold text-sm text-asha-dark mb-3">Breakdown by Size</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="font-body font-medium text-asha-muted text-xs pb-2 pr-4">Size</th>
                        {item.type === 'interest' && <th className="font-body font-medium text-asha-muted text-xs pb-2 pr-4">Interested</th>}
                        <th className="font-body font-medium text-asha-muted text-xs pb-2 pr-4">Ordered</th>
                        <th className="font-body font-medium text-asha-muted text-xs pb-2 pr-4">Ready</th>
                        <th className="font-body font-medium text-asha-muted text-xs pb-2 pr-4">Collected</th>
                        <th className="font-body font-medium text-asha-muted text-xs pb-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(bySizeStatus).map(([size, counts]) => {
                        const sizeCommitted = (counts.ordered || 0) + (counts.ready || 0) + (counts.picked_up || 0)
                        return (
                          <tr key={size} className="border-t border-asha-border/50">
                            <td className="font-body font-semibold text-asha-dark py-2 pr-4">{size}</td>
                            {item.type === 'interest' && <td className="font-body text-asha-dark py-2 pr-4">{counts.interested || 0}</td>}
                            <td className="font-body text-asha-dark py-2 pr-4">{counts.ordered || 0}</td>
                            <td className="font-body text-asha-dark py-2 pr-4">{counts.ready || 0}</td>
                            <td className="font-body text-asha-dark py-2 pr-4">{counts.picked_up || 0}</td>
                            <td className="font-body font-medium text-asha-orange py-2">
                              {item.price != null ? `$${(sizeCommitted * item.price).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-4">
              <h4 className="font-display font-semibold text-sm text-asha-dark mb-3">Individual Responses</h4>
              {itemResponses.length === 0 ? (
                <p className="font-body text-asha-muted text-sm">No responses yet</p>
              ) : (
                <div className="space-y-2">
                  {itemResponses.map(r => {
                    const u = users[r.athleteId]
                    return (
                      <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-asha-border/40 last:border-0">
                        <div className="flex items-center gap-2">
                          {u?.photoURL && <img src={u.photoURL} alt="" className="w-6 h-6 rounded-full" />}
                          <span className="font-body text-sm text-asha-dark">{u?.name || r.athleteId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.size && <span className="font-body text-xs bg-gray-100 text-asha-muted px-2 py-0.5 rounded">{r.size}</span>}
                          <StatusBadge status={r.status} />
                          {item.price != null && COMMITTED.includes(r.status) && (
                            <span className="font-body text-xs text-asha-orange font-medium">${item.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-asha-dark">Interest & Orders</h1>
          <p className="font-body text-asha-muted text-sm mt-1">Demand across all swag items</p>
        </div>
        {grandTotal > 0 && (
          <div className="bg-asha-orangeDim border border-asha-orange/20 rounded-2xl px-4 py-3 text-right">
            <div className="font-body text-xs text-asha-muted uppercase tracking-wide mb-0.5">Total Committed</div>
            <div className="font-display font-bold text-2xl text-asha-orange">${grandTotal.toFixed(2)}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-20 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <BarChart2 size={32} className="text-asha-muted mx-auto mb-3" />
          <p className="font-body text-asha-muted">No swag items created yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {inventoryItems.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-base text-asha-dark mb-3">Inventory Orders</h2>
              <div className="space-y-3">{inventoryItems.map(renderItem)}</div>
            </div>
          )}
          {interestItems.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-base text-asha-dark mb-3">Interest Polls</h2>
              <div className="space-y-3">{interestItems.map(renderItem)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
