import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Users, User, Search } from 'lucide-react'

const ALL_ROLES = ['athlete', 'coordinator', 'coach', 'serviceUser', 'owner']

const ROLE_META = {
  owner:       { label: 'Owner',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
  coordinator: { label: 'Coordinator',  color: 'bg-asha-orangeDim text-asha-orange border-asha-orange/20' },
  coach:       { label: 'Coach',        color: 'bg-blue-50 text-blue-600 border-blue-200' },
  athlete:     { label: 'Athlete',      color: 'bg-gray-100 text-asha-muted border-transparent' },
  serviceUser: { label: 'Service User', color: 'bg-gray-50 text-gray-400 border-gray-200' },
}

export default function UserManagement() {
  const { user: me, profile: myProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState({})

  const amIOwner = myProfile?.role === 'owner'

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

  const counts = {
    total: users.length,
    coordinators: users.filter(u => u.role === 'coordinator').length,
    coaches: users.filter(u => u.role === 'coach').length,
    athletes: users.filter(u => u.role === 'athlete').length,
  }

  // Roles available to assign — only owner can assign 'owner'
  const assignableRoles = amIOwner ? ALL_ROLES : ALL_ROLES.filter(r => r !== 'owner')

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 lg:max-w-4xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display font-bold text-xl text-asha-dark">User Management</h1>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total Members', val: counts.total },
            { label: 'Coordinators',  val: counts.coordinators },
            { label: 'Coaches',       val: counts.coaches },
            { label: 'Athletes',      val: counts.athletes },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white rounded-xl border border-asha-border p-2.5 text-center">
              <div className="font-mono font-bold text-xl text-asha-dark leading-none">{val}</div>
              <div className="font-body text-[9px] text-asha-muted uppercase tracking-widest mt-1">{label}</div>
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
          className="w-full pl-8 pr-4 py-2 border border-asha-border rounded-xl font-body text-sm focus:outline-none focus:border-asha-orange transition-colors"
        />
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-asha-border h-10 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={24} className="text-asha-muted mx-auto mb-3" />
          <p className="font-body text-asha-muted text-sm">No users found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto bg-white rounded-xl border border-asha-border">
            <table className="w-full">
              <thead className="bg-asha-cream/50 border-b border-asha-border">
                <tr>
                  <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 font-body font-medium text-xs text-asha-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-asha-border/40">
                {filtered.map(u => {
                  const isMe = u.id === me.uid
                  const isUpdating = updating[u.id]
                  const meta = ROLE_META[u.role] ?? ROLE_META.athlete
                  const canChange = !isMe && !(u.role === 'owner' && !amIOwner)
                  return (
                    <tr key={u.id} className={`transition-colors ${isMe ? 'bg-asha-cream/40' : 'hover:bg-gray-50/50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                              <User size={12} className="text-asha-orange" />
                            </div>
                          )}
                          <div>
                            <div className="font-body font-medium text-sm text-asha-dark">{u.name || '—'}</div>
                            {isMe && <span className="text-[10px] font-body text-asha-muted bg-gray-100 px-1 rounded">you</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-asha-muted">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-body font-medium px-2.5 py-1 rounded-full border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canChange && (
                          <select
                            value={u.role ?? 'athlete'}
                            disabled={isUpdating}
                            onChange={e => setRole(u.id, e.target.value)}
                            className="text-xs font-body font-medium px-2 py-1 rounded-lg border border-asha-border text-asha-muted hover:border-asha-orange focus:border-asha-orange focus:outline-none transition-all disabled:opacity-40 bg-white"
                          >
                            {assignableRoles.map(r => (
                              <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="lg:hidden bg-white rounded-xl border border-asha-border overflow-hidden divide-y divide-asha-border/50">
            {filtered.map(u => {
              const isMe = u.id === me.uid
              const isUpdating = updating[u.id]
              const meta = ROLE_META[u.role] ?? ROLE_META.athlete
              const canChange = !isMe && !(u.role === 'owner' && !amIOwner)

              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-3.5 py-2.5 ${isMe ? 'bg-asha-cream/40' : 'hover:bg-gray-50/50'} transition-colors`}
                >
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-asha-orange" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body font-medium text-sm text-asha-dark">{u.name || '—'}</span>
                      {isMe && <span className="text-xs font-body text-asha-muted bg-gray-100 px-1.5 py-0.5 rounded">you</span>}
                    </div>
                    <div className="font-body text-xs text-asha-muted">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-body font-medium px-2.5 py-1 rounded-full border ${meta.color}`}>
                      {meta.label}
                    </span>
                    {canChange && (
                      <select
                        value={u.role ?? 'athlete'}
                        disabled={isUpdating}
                        onChange={e => setRole(u.id, e.target.value)}
                        className="text-xs font-body font-medium px-2 py-1 rounded-lg border border-asha-border text-asha-muted hover:border-asha-orange focus:border-asha-orange focus:outline-none transition-all disabled:opacity-40 bg-white"
                      >
                        {assignableRoles.map(r => (
                          <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
