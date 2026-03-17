import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { ShoppingBag, Check, ChevronDown } from 'lucide-react'

function SwagCard({ item, myResponse, onSubmit, onWithdraw }) {
  const [selectedSize, setSelectedSize] = useState(myResponse?.size || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const hasResponse = !!myResponse
  const isInventory = item.type === 'inventory'
  const canCancel = hasResponse && !item.isLocked && (myResponse.status === 'interested' || myResponse.status === 'ordered')

  const getStock = (size) => item.inventory?.[size] ?? 0
  const totalStock = item.hasSizes
    ? (item.sizes || []).reduce((sum, s) => sum + (item.inventory?.[s] || 0), 0)
    : (item.inventory?.['One Size'] || 0)

  const stockStatus = isInventory
    ? (totalStock === 0 ? 'out_of_stock' : totalStock <= 3 ? 'low_stock' : 'available')
    : 'interest'

  const sizeOptions = item.hasSizes ? (item.sizes || []) : ['One Size']
  const selectedSizeStock = isInventory ? getStock(selectedSize || 'One Size') : null
  const canClaim = !isInventory || (selectedSizeStock !== null && selectedSizeStock > 0)

  const handleSubmit = async () => {
    if (!selectedSize && item.hasSizes) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(item, selectedSize || 'One Size')
    } catch (e) {
      setError(e.message || 'Something went wrong')
    }
    setSubmitting(false)
  }

  const handleWithdraw = async () => {
    setSubmitting(true)
    await onWithdraw(myResponse)
    setSubmitting(false)
  }

  return (
    <div className={`bg-white rounded-2xl border transition-all flex flex-col overflow-hidden ${hasResponse ? 'border-asha-orange/40 shadow-sm' : 'border-asha-border hover:border-asha-orange/30 hover:shadow-sm'}`}>
      {/* Image or color band */}
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" onError={e => e.target.style.display='none'} />
      ) : (
        <div className={`h-1.5 ${hasResponse ? 'bg-asha-orange' : 'bg-asha-border'}`} />
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-display font-bold text-asha-dark text-base leading-snug">{item.name}</h3>
            {item.price != null && (
              <span className="font-body text-sm font-semibold text-asha-orange">${item.price.toFixed(2)}</span>
            )}
            {item.description && <p className="font-body text-xs text-asha-muted mt-1 leading-relaxed">{item.description}</p>}
          </div>
          <StatusBadge status={stockStatus} />
        </div>

        {/* Inventory stock indicator */}
        {isInventory && (
          <div className="mt-2 mb-3">
            {item.hasSizes ? (
              <div className="flex flex-wrap gap-1.5">
                {sizeOptions.map(s => {
                  const stock = getStock(s)
                  return (
                    <span key={s} className={`text-xs font-body px-2 py-0.5 rounded border ${stock > 0 ? 'bg-gray-50 border-asha-border text-asha-dark' : 'bg-gray-100 border-gray-200 text-gray-300 line-through'}`}>
                      {s} <span className="text-asha-muted">({stock})</span>
                    </span>
                  )
                })}
              </div>
            ) : (
              <span className="font-body text-xs text-asha-muted">{totalStock} unit{totalStock !== 1 ? 's' : ''} available</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Response area */}
        {hasResponse ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 bg-asha-orangeDim rounded-xl px-3 py-2.5">
              <Check size={14} className="text-asha-orange flex-shrink-0" />
              <span className="font-body text-sm text-asha-orange font-medium">
                {isInventory ? 'Ordered' : 'Interest submitted'}
                {myResponse.size && myResponse.size !== 'One Size' && ` — ${myResponse.size}`}
              </span>
            </div>
            {canCancel ? (
              <button
                onClick={handleWithdraw}
                disabled={submitting}
                className="w-full py-2 rounded-xl border border-asha-border font-body text-xs text-asha-muted hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                {submitting ? 'Cancelling…' : 'Cancel'}
              </button>
            ) : (
              <div className="text-center flex items-center justify-center gap-1.5">
                <StatusBadge status={myResponse.status} />
                {item.isLocked && <span className="font-body text-xs text-asha-muted">(locked)</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {item.hasSizes && (
              <div className="relative">
                <select
                  value={selectedSize}
                  onChange={e => setSelectedSize(e.target.value)}
                  className="w-full appearance-none border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors bg-white pr-8"
                >
                  <option value="">Select size…</option>
                  {sizeOptions.map(s => {
                    const stock = isInventory ? getStock(s) : null
                    const unavailable = isInventory && stock === 0
                    return (
                      <option key={s} value={s} disabled={unavailable}>
                        {s}{isInventory ? ` (${stock} left)` : ''}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-asha-muted pointer-events-none" />
              </div>
            )}

            {error && <p className="font-body text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || (item.hasSizes && !selectedSize) || (isInventory && !canClaim) || stockStatus === 'out_of_stock'}
              className="w-full py-2.5 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : isInventory ? 'Order Now' : 'Express Interest'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SwagBrowse() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [myResponses, setMyResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchAll = async () => {
    const [itemsSnap, mySnap] = await Promise.all([
      getDocs(collection(db, 'swagItems')),
      getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid))),
    ])
    setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.isActive))
    setMyResponses(mySnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [user.uid])

  const handleSubmit = async (item, size) => {
    if (item.type === 'inventory') {
      // Transactionally decrement stock and create response
      await runTransaction(db, async (tx) => {
        const itemRef = doc(db, 'swagItems', item.id)
        const snap = await tx.get(itemRef)
        const stock = snap.data().inventory?.[size] || 0
        if (stock <= 0) throw new Error('Sorry, that size just sold out')
        tx.update(itemRef, { [`inventory.${size}`]: stock - 1 })
        const responseRef = doc(collection(db, 'swagResponses'))
        tx.set(responseRef, {
          athleteId: user.uid,
          itemId: item.id,
          size,
          status: 'ordered',
          createdAt: serverTimestamp(),
        })
      })
    } else {
      await addDoc(collection(db, 'swagResponses'), {
        athleteId: user.uid,
        itemId: item.id,
        size,
        status: 'interested',
        createdAt: serverTimestamp(),
      })
    }
    await fetchAll()
  }

  const handleWithdraw = async (response) => {
    const item = items.find(i => i.id === response.itemId)
    if (item?.type === 'inventory' && response.status === 'ordered') {
      // Restore stock atomically
      await runTransaction(db, async (tx) => {
        const itemRef = doc(db, 'swagItems', item.id)
        tx.update(itemRef, { [`inventory.${response.size}`]: increment(1) })
        tx.delete(doc(db, 'swagResponses', response.id))
      })
    } else {
      await deleteDoc(doc(db, 'swagResponses', response.id))
    }
    await fetchAll()
  }

  const myResponseMap = {}
  myResponses.forEach(r => { myResponseMap[r.itemId] = r })

  const filtered = items.filter(i => filter === 'all' || i.type === filter)
  const interestCount = items.filter(i => i.type === 'interest').length
  const inventoryCount = items.filter(i => i.type === 'inventory').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="font-display font-bold text-3xl text-asha-dark">Browse Swag</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Express interest in upcoming items or order available stock</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { val: 'all', label: `All (${items.length})` },
          { val: 'interest', label: `Interest Polls (${interestCount})` },
          { val: 'inventory', label: `In Stock (${inventoryCount})` },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl font-body font-medium text-sm transition-all ${filter === val ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-52 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={24} className="text-asha-orange" />
          </div>
          <h3 className="font-display font-semibold text-asha-dark mb-1">No items available</h3>
          <p className="font-body text-asha-muted text-sm">Check back soon — your coordinators will add items here</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <SwagCard
              key={item.id}
              item={item}
              myResponse={myResponseMap[item.id] || null}
              onSubmit={handleSubmit}
              onWithdraw={handleWithdraw}
            />
          ))}
        </div>
      )}
    </div>
  )
}
