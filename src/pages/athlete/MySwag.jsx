import { useEffect, useState } from 'react'
import { collection, getDocs, getDoc, query, where, deleteDoc, doc, runTransaction, increment } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { Star, CheckCircle2, Clock, Truck, MapPin } from 'lucide-react'
import { fmtUSD } from '../../utils/format'

const STATUS_META = {
  interested: { icon: Clock, label: 'Interest submitted', color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Your coordinator will review and place orders.' },
  ordered: { icon: Truck, label: 'Ordered', color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Your item has been ordered and is on its way.' },
  ready: { icon: MapPin, label: 'Ready for Pickup!', color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Go collect your swag from your coordinator.' },
  picked_up: { icon: CheckCircle2, label: 'Collected', color: 'text-gray-400', bg: 'bg-gray-50', desc: 'Done! Hope you love it.' },
}

const COMMITTED = ['interested', 'ordered', 'ready', 'picked_up']

function ProgressBar({ status, itemType }) {
  const steps = itemType === 'inventory'
    ? ['ordered', 'ready', 'picked_up']
    : ['interested', 'ordered', 'ready', 'picked_up']
  const currentIdx = steps.indexOf(status)
  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((s, i) => {
        const done = i <= currentIdx
        const isLast = i === steps.length - 1
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${done ? 'bg-asha-orange scale-110' : 'bg-gray-200'}`} />
            {!isLast && <div className={`h-0.5 flex-1 transition-all ${i < currentIdx ? 'bg-asha-orange' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default function MySwag() {
  const { user } = useAuth()
  const [responses, setResponses] = useState([])
  const [itemMap, setItemMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    async function load() {
      const mySnap = await getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid)))
      const myResponses = mySnap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Fetch only the specific items this athlete has responses for
      const itemIds = [...new Set(myResponses.map(r => r.itemId))]
      const itemDocs = await Promise.all(itemIds.map(id => getDoc(doc(db, 'swagItems', id))))
      const map = {}
      itemDocs.forEach(d => { if (d.exists()) map[d.id] = { id: d.id, ...d.data() } })
      setItemMap(map)
      setResponses(myResponses)
      setLoading(false)
    }
    load()
  }, [user.uid])

  const cancelResponse = async (r) => {
    const item = itemMap[r.itemId]
    if (item?.type === 'inventory' && r.status === 'ordered') {
      await runTransaction(db, async (tx) => {
        tx.update(doc(db, 'swagItems', item.id), { [`inventory.${r.size}`]: increment(1) })
        tx.delete(doc(db, 'swagResponses', r.id))
      })
    } else {
      await deleteDoc(doc(db, 'swagResponses', r.id))
    }
    setResponses(prev => prev.filter(x => x.id !== r.id))
  }

  const readyCount = responses.filter(r => r.status === 'ready').length
  const activeCount = responses.filter(r => r.status !== 'picked_up').length
  const totalSpend = responses
    .filter(r => COMMITTED.includes(r.status))
    .reduce((sum, r) => sum + (itemMap[r.itemId]?.price || 0), 0)

  const filtered = responses.filter(r => filterStatus === 'all' || r.status === filterStatus)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">My Swag</h1>
      </div>

      {/* Summary strip */}
      {!loading && responses.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'REQUESTED', val: String(responses.length), color: 'text-asha-dark' },
            { label: 'IN PROGRESS', val: String(activeCount), color: 'text-amber-600' },
            { label: 'READY', val: String(readyCount), color: 'text-emerald-600' },
            { label: 'MY TOTAL', val: fmtUSD(totalSpend), color: 'text-asha-orange' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl border border-asha-border p-3 text-center">
              <div className={`font-mono font-bold text-xl leading-none ${color}`}>{val}</div>
              <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pickup alert */}
      {readyCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <MapPin size={15} className="text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-body font-semibold text-emerald-800 text-sm">
              {readyCount} item{readyCount > 1 ? 's' : ''} ready for pickup!
            </div>
            <div className="font-body text-xs text-emerald-700 mt-0.5">
              Contact your coordinator to collect your swag.
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { val: 'all', label: 'All' },
          { val: 'interested', label: 'Interested' },
          { val: 'ordered', label: 'Ordered' },
          { val: 'ready', label: 'Ready' },
          { val: 'picked_up', label: 'Collected' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`px-2.5 py-1 rounded-lg font-body font-medium text-xs transition-all flex-shrink-0 ${filterStatus === val ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-12 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Star size={24} className="text-asha-muted mx-auto mb-2" />
          <h3 className="font-display font-semibold text-sm text-asha-dark mb-1">
            {responses.length === 0 ? 'No swag yet' : 'Nothing here'}
          </h3>
          <p className="font-body text-asha-muted text-xs">
            {responses.length === 0 ? 'Browse available items and express your interest' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
          {filtered.map(r => {
            const item = itemMap[r.itemId]
            const meta = STATUS_META[r.status] || STATUS_META.interested
            const StatusIcon = meta.icon

            return (
              <div key={r.id} className="px-3.5 py-3 lg:grid lg:grid-cols-[1fr_180px_auto] lg:gap-4 lg:items-center">
                {/* Name + status description */}
                <div className="flex items-center gap-3">
                  <StatusIcon size={14} className={`${meta.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body font-medium text-sm text-asha-dark truncate">{item?.name || '—'}</span>
                      {r.size && r.size !== 'One Size' && (
                        <span className="font-body text-[10px] px-1.5 py-px rounded bg-asha-cream text-asha-muted flex-shrink-0">{r.size}</span>
                      )}
                    </div>
                    <div className="font-body text-[10px] text-asha-muted mt-0.5">{meta.desc}</div>
                    <ProgressBar status={r.status} itemType={item?.type} />
                  </div>
                </div>
                {/* Status badge + price */}
                <div className="hidden lg:flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {item?.price != null && (
                    <span className="font-mono text-xs font-semibold text-asha-orange">{fmtUSD(item.price)}</span>
                  )}
                </div>
                {/* Mobile: price + badge inline */}
                <div className="lg:hidden flex items-center gap-2 flex-shrink-0 mt-2">
                  {item?.price != null && (
                    <span className="font-mono text-xs font-semibold text-asha-orange">{fmtUSD(item.price)}</span>
                  )}
                  <StatusBadge status={r.status} />
                </div>
                {/* Cancel / locked */}
                <div className="lg:flex lg:justify-end">
                  {(r.status === 'interested' || r.status === 'ordered') && !item?.isLocked && (
                    <div className="mt-2 pt-2 border-t border-asha-border/50 lg:mt-0 lg:pt-0 lg:border-0">
                      <button
                        onClick={() => { if (confirm('Cancel this order?')) cancelResponse(r) }}
                        className="text-xs font-body text-asha-muted hover:text-red-500 transition-colors"
                      >
                        Cancel order
                      </button>
                    </div>
                  )}
                  {item?.isLocked && (r.status === 'interested' || r.status === 'ordered') && (
                    <div className="mt-2 pt-2 border-t border-asha-border/50 lg:mt-0 lg:pt-0 lg:border-0">
                      <span className="text-xs font-body text-asha-muted">Order locked by coordinator</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
