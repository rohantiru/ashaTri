import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { ShoppingBag, Star, ArrowRight, Package } from 'lucide-react'

export default function AthleteDashboard() {
  const { user, profile } = useAuth()
  const [myResponses, setMyResponses] = useState([])
  const [itemMap, setItemMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [itemsSnap, responsesSnap] = await Promise.all([
        getDocs(collection(db, 'swagItems')),
        getDocs(query(collection(db, 'swagResponses'), where('athleteId', '==', user.uid))),
      ])
      const map = {}
      itemsSnap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() } })
      setItemMap(map)
      setMyResponses(responsesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [user.uid])

  const readyItems = myResponses.filter(r => r.status === 'ready')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <p className="font-body text-asha-muted text-sm mb-1">Welcome back</p>
        <h1 className="font-display font-bold text-3xl text-asha-dark">{profile?.name?.split(' ')[0]} 👋</h1>
      </div>

      {/* Pickup alert */}
      {readyItems.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-emerald-800 text-sm">
              {readyItems.length} item{readyItems.length > 1 ? 's' : ''} ready for pickup!
            </div>
            <div className="font-body text-xs text-emerald-700 mt-0.5">Your coordinator has your swag ready to collect.</div>
          </div>
          <Link to="/athlete/my-swag" className="text-xs font-body font-medium text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
            View <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link to="/athlete/browse" className="bg-asha-orange rounded-2xl p-5 hover:bg-asha-orangeLight transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <div className="font-display font-bold text-white text-lg">Browse Swag</div>
          <div className="font-body text-white/80 text-sm mt-1">Explore available items and express interest</div>
          <ArrowRight size={16} className="text-white/60 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to="/athlete/my-swag" className="bg-white border border-asha-border rounded-2xl p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 rounded-xl bg-asha-orangeDim flex items-center justify-center mb-3">
            <Star size={20} className="text-asha-orange" />
          </div>
          <div className="font-display font-bold text-asha-dark text-lg">My Swag</div>
          <div className="font-body text-asha-muted text-sm mt-1">Track your requests and pickup status</div>
          <div className="font-body text-xs text-asha-muted mt-3">{myResponses.length} item{myResponses.length !== 1 ? 's' : ''} requested</div>
        </Link>
      </div>

      {/* Recent activity */}
      {!loading && myResponses.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg text-asha-dark mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {myResponses.slice(0, 4).map(r => {
              const item = itemMap[r.itemId]
              return (
                <div key={r.id} className="bg-white rounded-xl border border-asha-border flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-asha-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-medium text-sm text-asha-dark">{item?.name || '—'}</div>
                    {r.size && <div className="font-body text-xs text-asha-muted">Size: {r.size}</div>}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              )
            })}
            {myResponses.length > 4 && (
              <Link to="/athlete/my-swag" className="block text-center text-sm font-body text-asha-orange hover:underline py-2">
                View all {myResponses.length} items
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
