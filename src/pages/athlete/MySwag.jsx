import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { Star, CheckCircle2, Clock, Truck, MapPin } from 'lucide-react'

const STATUS_META = {
  interested: { icon: Clock, label: 'Interest submitted', color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Your coordinator will review and place orders.' },
  ordered: { icon: Truck, label: 'Ordered', color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Your item has been ordered and is on its way.' },
  ready: { icon: MapPin, label: 'Ready for Pickup!', color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Go collect your swag from your coordinator.' },
  picked_up: { icon: CheckCircle2, label: 'Collected', color: 'text-gray-400', bg: 'bg-gray-50', desc: 'Done! Hope you love it.' },
}

const COMMITTED = ['ordered', 'ready', 'picked_up']

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
      const [itemsSnap, mySnap] = await Promise.all([
        getDocs(collection(db, 'swagItems')),
        getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid))),
      ])
      const map = {}
      itemsSnap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() } })
      setItemMap(map)
      setResponses(mySnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [user.uid])

  const readyCount = responses.filter(r => r.status === 'ready').length
  const activeCount = responses.filter(r => r.status !== 'picked_up').length
  const totalSpend = responses
    .filter(r => COMMITTED.includes(r.status))
    .reduce((sum, r) => sum + (itemMap[r.itemId]?.price || 0), 0)

  const filtered = responses.filter(r => filterStatus === 'all' || r.status === filterStatus)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="font-display font-bold text-3xl text-asha-dark">My Swag</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Track your requests from interest to pickup</p>
      </div>

      {/* Summary row */}
      {!loading && responses.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Requested', val: responses.length, color: 'text-asha-dark' },
            { label: 'In Progress', val: activeCount, color: 'text-amber-600' },
            { label: 'Ready to Collect', val: readyCount, color: 'text-emerald-600' },
            { label: 'My Total', val: `$${totalSpend.toFixed(2)}`, color: 'text-asha-orange' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-asha-border p-4 text-center">
              <div className={`font-display font-bold text-xl ${color}`}>{val}</div>
              <div className="font-body text-xs text-asha-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pickup alert */}
      {readyCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <MapPin size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-display font-semibold text-emerald-800 text-sm">
              {readyCount} item{readyCount > 1 ? 's' : ''} ready for pickup!
            </div>
            <div className="font-body text-xs text-emerald-700 mt-0.5">
              Contact your coordinator to collect your swag.
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
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
            className={`px-3 py-1.5 rounded-lg font-body font-medium text-xs transition-all ${filterStatus === val ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-28 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
            <Star size={24} className="text-asha-orange" />
          </div>
          <h3 className="font-display font-semibold text-asha-dark mb-1">
            {responses.length === 0 ? 'No swag yet' : 'Nothing here'}
          </h3>
          <p className="font-body text-asha-muted text-sm">
            {responses.length === 0 ? 'Browse available items and express your interest' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const item = itemMap[r.itemId]
            const meta = STATUS_META[r.status] || STATUS_META.interested
            const StatusIcon = meta.icon

            return (
              <div key={r.id} className={`bg-white rounded-2xl border overflow-hidden ${r.status === 'ready' ? 'border-emerald-200' : 'border-asha-border'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <StatusIcon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display font-semibold text-asha-dark">{item?.name || '—'}</div>
                          <div className="font-body text-xs text-asha-muted mt-0.5">{meta.desc}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.size && r.size !== 'One Size' && (
                            <span className="font-body text-xs bg-gray-100 text-asha-muted px-2 py-0.5 rounded">{r.size}</span>
                          )}
                          {item?.price != null && (
                            <span className="font-body text-sm font-semibold text-asha-orange">${item.price.toFixed(2)}</span>
                          )}
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                      <ProgressBar status={r.status} itemType={item?.type} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
