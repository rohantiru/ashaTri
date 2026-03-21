import { useEffect, useState } from 'react'
import { collection, getDocs, onSnapshot, query, where, addDoc, deleteDoc, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { ShoppingBag, Check, ChevronDown, Lock } from 'lucide-react'
import { fmtUSD } from '../../utils/format'

function SwagCard({ item, myResponse, onSubmit, onWithdraw }) {
  const [selectedSize, setSelectedSize] = useState(myResponse?.size || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const hasResponse = !!myResponse
  const isInventory = item.type === 'inventory'
  const canCancel = hasResponse && !item.isLocked && (myResponse.status === 'interested' || myResponse.status === 'ordered')
  const isLocked = item.isLocked

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
    <div className={`flex items-center gap-3 px-3.5 py-3 ${hasResponse ? 'bg-asha-orangeDim/20' : ''}`}>
      {/* Thumbnail or accent */}
      {item.imageUrl
        ? <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-asha-border" onError={e => e.target.style.display = 'none'} />
        : <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${hasResponse ? 'bg-asha-orange' : 'bg-asha-border'}`} />
      }

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body font-medium text-sm text-asha-dark">{item.name}</span>
          {item.price != null && <span className="font-mono text-[10px] font-semibold text-asha-orange">{fmtUSD(item.price)}</span>}
          <StatusBadge status={stockStatus} />
        </div>
        {isInventory && item.hasSizes && (
          <div className="flex flex-wrap gap-1 mt-1">
            {sizeOptions.map(s => {
              const stock = getStock(s)
              return (
                <span key={s} className={`font-body text-[9px] px-1.5 py-px rounded border ${stock > 0 ? 'bg-gray-50 border-asha-border text-asha-dark' : 'bg-gray-100 border-gray-200 text-gray-300 line-through'}`}>
                  {s} ({stock})
                </span>
              )
            })}
          </div>
        )}
        {isInventory && !item.hasSizes && (
          <span className="font-body text-[10px] text-asha-muted">{totalStock} available</span>
        )}
        {hasResponse && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Check size={11} className="text-asha-orange" />
            <span className="font-body text-[10px] text-asha-orange">
              {isInventory ? 'Ordered' : 'Interested'}
              {myResponse.size && myResponse.size !== 'One Size' && ` · ${myResponse.size}`}
            </span>
            {canCancel && (
              <button onClick={handleWithdraw} disabled={submitting}
                className="font-body text-[10px] text-asha-muted hover:text-red-500 transition-colors ml-1 disabled:opacity-50">
                {submitting ? '…' : '· Cancel'}
              </button>
            )}
          </div>
        )}
        {error && <p className="font-body text-[10px] text-red-500 mt-0.5">{error}</p>}
      </div>

      {/* Action */}
      {!hasResponse && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.hasSizes && (
            <div className="relative">
              <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}
                className="appearance-none border border-asha-border rounded-lg pl-2 pr-5 py-1 font-body text-xs focus:outline-none focus:border-asha-orange bg-white w-20">
                <option value="">Size</option>
                {sizeOptions.map(s => {
                  const stock = isInventory ? getStock(s) : null
                  return <option key={s} value={s} disabled={isInventory && stock === 0}>{s}{isInventory ? ` (${stock})` : ''}</option>
                })}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-asha-muted pointer-events-none" />
            </div>
          )}
          {isLocked
            ? <span className="font-body text-[10px] text-asha-muted flex items-center gap-1"><Lock size={10} />Locked</span>
            : <button onClick={handleSubmit}
                disabled={submitting || (item.hasSizes && !selectedSize) || (isInventory && !canClaim) || stockStatus === 'out_of_stock'}
                className="font-body font-medium text-xs px-2.5 py-1 bg-asha-orange text-white rounded-lg hover:bg-asha-orangeLight transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                {submitting ? '…' : isInventory ? 'Order' : 'Interested'}
              </button>
          }
        </div>
      )}
      {hasResponse && !canCancel && (
        <div className="flex-shrink-0">
          <StatusBadge status={myResponse.status} />
          {item.isLocked && <span className="font-body text-[9px] text-asha-muted block text-right">locked</span>}
        </div>
      )}
    </div>
  )
}

export default function SwagBrowse() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [myResponses, setMyResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Live inventory updates via onSnapshot
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'swagItems'), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.isActive))
    })
    return unsub
  }, [])

  const fetchMyResponses = async () => {
    const mySnap = await getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid)))
    setMyResponses(mySnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { fetchMyResponses() }, [user.uid])

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
    await fetchMyResponses()
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
    await fetchMyResponses()
  }

  const myResponseMap = {}
  myResponses.forEach(r => { myResponseMap[r.itemId] = r })

  const filtered = items.filter(i => filter === 'all' || i.type === filter)
  const interestCount = items.filter(i => i.type === 'interest').length
  const inventoryCount = items.filter(i => i.type === 'inventory').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">Browse Swag</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { val: 'all', label: `All (${items.length})` },
          { val: 'interest', label: `Interest Polls (${interestCount})` },
          { val: 'inventory', label: `In Stock (${inventoryCount})` },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-2.5 py-1 rounded-lg font-body font-medium text-xs transition-all ${filter === val ? 'bg-asha-dark text-white' : 'bg-white border border-asha-border text-asha-muted hover:border-asha-orange/40'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-36 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-asha-orangeDim flex items-center justify-center mx-auto mb-3">
            <ShoppingBag size={24} className="text-asha-orange" />
          </div>
          <h3 className="font-display font-semibold text-asha-dark mb-1 text-sm">No items available</h3>
          <p className="font-body text-asha-muted text-sm">Check back soon — your coordinators will add items here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
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
