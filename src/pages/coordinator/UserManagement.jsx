import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Users, ShieldCheck, User, Search } from 'lucide-react'

export default function UserManagement() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState({})

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, 'users'))
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    data.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const setRole = async (uid, role) => {
    setUpdating(u => ({ ...u, [uid]: true }))
    await updateDoc(doc(db, 'users', uid), { role })
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, role } : u))
    setUpdating(u => ({ ...u, [uid]: false }))
  }

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  const coordCount = users.filter(u => u.role === 'coordinator').length
  const athleteCount = users.filter(u => u.role === 'athlete').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-asha-dark">User Management</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Assign roles to members of the team</p>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Members', val: users.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Coordinators', val: coordCount, icon: ShieldCheck, color: 'bg-asha-orangeDim text-asha-orange' },
            { label: 'Athletes', val: athleteCount, icon: User, color: 'bg-gray-100 text-asha-muted' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-asha-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="font-display font-bold text-xl text-asha-dark">{val}</div>
                <div className="font-body text-xs text-asha-muted">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-asha-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-8 pr-4 py-2.5 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
        />
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-asha-border h-16 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={32} className="text-asha-muted mx-auto mb-3" />
          <p className="font-body text-asha-muted">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-asha-border overflow-hidden">
          {filtered.map((u, idx) => {
            const isMe = u.id === me.uid
            const isUpdating = updating[u.id]
            const isCoord = u.role === 'coordinator'
            return (
              <div
                key={u.id}
                className={`flex items-center gap-4 px-4 py-3 ${idx !== filtered.length - 1 ? 'border-b border-asha-border/50' : ''} ${isMe ? 'bg-asha-cream/40' : 'hover:bg-gray-50/50'} transition-colors`}
              >
                {/* Avatar */}
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-asha-orange" />
                  </div>
                )}

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-body font-medium text-sm text-asha-dark">{u.name || '—'}</span>
                    {isMe && <span className="text-xs font-body text-asha-muted bg-gray-100 px-1.5 py-0.5 rounded">you</span>}
                  </div>
                  <div className="font-body text-xs text-asha-muted">{u.email}</div>
                </div>

                {/* Role badge + toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-body font-medium px-2.5 py-1 rounded-full ${isCoord ? 'bg-asha-orangeDim text-asha-orange border border-asha-orange/20' : 'bg-gray-100 text-asha-muted'}`}>
                    {isCoord ? 'Coordinator' : 'Athlete'}
                  </span>
                  {!isMe && (
                    <button
                      onClick={() => setRole(u.id, isCoord ? 'athlete' : 'coordinator')}
                      disabled={isUpdating}
                      className="text-xs font-body font-medium px-3 py-1.5 rounded-lg border border-asha-border text-asha-muted hover:border-asha-orange hover:text-asha-orange transition-all disabled:opacity-40"
                    >
                      {isUpdating ? '…' : isCoord ? 'Make Athlete' : 'Make Coord'}
                    </button>
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
