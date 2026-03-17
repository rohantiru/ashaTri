import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Package, BarChart2, CheckSquare, TrendingUp, Users, ArrowRight, DollarSign } from 'lucide-react'
import { fmtUSD } from '../../utils/format'

export default function CoordinatorDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ items: 0, interestItems: 0, inventoryItems: 0, totalResponses: 0, pendingPickup: 0, collected: 0, totalValue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [itemsSnap, responsesSnap] = await Promise.all([
        getDocs(collection(db, 'swagItems')),
        getDocs(collection(db, 'swagResponses')),
      ])

      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const responses = responsesSnap.docs.map(d => d.data())
      const itemPriceMap = {}
      items.forEach(i => { itemPriceMap[i.id] = i.price || 0 })

      const committed = responses.filter(r => ['interested', 'ordered', 'ready', 'picked_up'].includes(r.status))
      const totalValue = committed.reduce((sum, r) => sum + (itemPriceMap[r.itemId] || 0), 0)

      setStats({
        items: items.length,
        interestItems: items.filter(i => i.type === 'interest').length,
        inventoryItems: items.filter(i => i.type === 'inventory').length,
        totalResponses: responses.length,
        pendingPickup: responses.filter(r => r.status === 'ready').length,
        collected: responses.filter(r => r.status === 'picked_up').length,
        totalValue,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Swag Items', value: stats.items, sub: `${stats.interestItems} interest · ${stats.inventoryItems} inventory`, icon: Package, to: '/coord/items', color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Responses', value: stats.totalResponses, sub: 'across all items', icon: TrendingUp, to: '/coord/interest', color: 'bg-purple-50 text-purple-600' },
    { label: 'Awaiting Pickup', value: stats.pendingPickup, sub: 'ready to collect', icon: CheckSquare, to: '/coord/pickup', color: 'bg-amber-50 text-amber-600' },
    { label: 'Orders Value', value: fmtUSD(stats.totalValue), sub: 'committed orders', icon: DollarSign, to: '/coord/interest', color: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="font-body text-asha-muted text-sm mb-1">Welcome back, {profile?.name?.split(' ')[0]}</p>
        <h1 className="font-display font-bold text-3xl text-asha-dark">Coordinator Overview</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-asha-border p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(({ label, value, sub, icon: Icon, to, color }) => (
            <Link key={label} to={to} className="bg-white rounded-2xl border border-asha-border p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon size={16} />
              </div>
              <div className="font-display font-bold text-2xl text-asha-dark">{value}</div>
              <div className="font-body font-medium text-sm text-asha-dark mt-0.5">{label}</div>
              <div className="font-body text-xs text-asha-muted mt-0.5">{sub}</div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="font-display font-semibold text-lg text-asha-dark mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/coord/items', label: 'Manage Swag Items', desc: 'Add items, set prices, update inventory', icon: Package },
          { to: '/coord/interest', label: 'View Interest & Orders', desc: 'See who wants what and total committed value', icon: BarChart2 },
          { to: '/coord/pickup', label: 'Manage Pickups', desc: 'Mark items as ready and track collection', icon: CheckSquare },
        ].map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="bg-white rounded-2xl border border-asha-border p-5 hover:border-asha-orange/40 hover:shadow-sm transition-all group flex items-start gap-4">
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
