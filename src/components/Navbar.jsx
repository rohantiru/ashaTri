import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, COORD_ROLES } from '../contexts/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'
import {
  LogOut, LayoutDashboard, ShoppingBag, Flag, Receipt, Settings,
  Users, Menu, X, ArrowLeftRight, BarChart2, CheckSquare, Package,
} from 'lucide-react'

const ROLE_LABELS = {
  coordinator: 'Coordinator',
  coach: 'Coach',
  owner: 'Owner',
}

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const { config } = useAppConfig()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isCoordLike = COORD_ROLES.includes(profile?.role)
  const isAthleteMode = location.pathname.startsWith('/athlete')
  const isOwner = profile?.role === 'owner' || user?.email === config.ownerEmail

  // ── Athlete nav ──────────────────────────────────────────────────────────
  const swagEnabled = config.tabs.swag
  const expensesEnabled = config.tabs.expenses

  const homeEnabled = config.tabs.home
  const racesEnabled = config.tabs.races

  const athletePrimary = [
    ...(homeEnabled ? [{ key: 'home', label: 'Home', icon: LayoutDashboard, to: '/athlete' }] : []),
    ...(swagEnabled ? [{ key: 'swag', label: 'Swag', icon: ShoppingBag, to: '/athlete/browse' }] : []),
    ...(racesEnabled ? [{ key: 'races', label: 'Races', icon: Flag, to: '/athlete/races' }] : []),
    ...(expensesEnabled ? [{ key: 'expenses', label: 'Expenses', icon: Receipt, to: '/athlete/expenses' }] : []),
  ]

  const athleteSwagSub = swagEnabled ? [
    { to: '/athlete/browse', label: 'Browse' },
    { to: '/athlete/my-swag', label: 'My Swag' },
  ] : []

  const inAthleteSwag = ['/athlete/browse', '/athlete/my-swag'].includes(location.pathname)

  const athleteActiveKey = (() => {
    const p = location.pathname
    if (p === '/athlete') return 'home'
    if (inAthleteSwag) return 'swag'
    if (p === '/athlete/races') return 'races'
    if (p === '/athlete/expenses') return 'expenses'
    return ''
  })()

  // ── Coordinator nav ──────────────────────────────────────────────────────
  const coordPrimary = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/coord' },
    { key: 'swag', label: 'Swag', icon: ShoppingBag, to: '/coord/items' },
    { key: 'races', label: 'Races', icon: Flag, to: '/coord/races' },
    { key: 'athletes', label: 'Athletes', icon: Users, to: '/coord/athletes' },
    { key: 'expenses', label: 'Expenses', icon: Receipt, to: '/coord/expenses' },
    ...(isOwner ? [
      { key: 'settings', label: 'Settings', icon: Settings, to: '/coord/settings' },
      { key: 'users', label: 'Users', icon: Users, to: '/coord/users' },
    ] : []),
  ]

  const coordSwagSub = [
    { to: '/coord/items', label: 'Items', icon: Package },
    { to: '/coord/interest', label: 'Interest', icon: BarChart2 },
    { to: '/coord/pickup', label: 'Pickup', icon: CheckSquare },
  ]

  const inCoordSwag = ['/coord/items', '/coord/interest', '/coord/pickup'].includes(location.pathname)

  const coordActiveKey = (() => {
    const p = location.pathname
    if (p === '/coord') return 'overview'
    if (inCoordSwag) return 'swag'
    if (p === '/coord/races') return 'races'
    if (p === '/coord/athletes') return 'athletes'
    if (p === '/coord/expenses') return 'expenses'
    if (p === '/coord/settings') return 'settings'
    if (p === '/coord/users') return 'users'
    return ''
  })()

  // ── Active set ───────────────────────────────────────────────────────────
  const inCoordMode = isCoordLike && !isAthleteMode
  const primaryLinks = inCoordMode ? coordPrimary : athletePrimary
  const subLinks = inCoordMode
    ? (inCoordSwag ? coordSwagSub : [])
    : (inAthleteSwag ? athleteSwagSub : [])
  const activeKey = inCoordMode ? coordActiveKey : athleteActiveKey

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNav = (to) => {
    navigate(to)
    setOpen(false)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-asha-dark border-b border-asha-mid">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-asha-orange flex items-center justify-center flex-shrink-0">
              <span className="text-white font-body font-bold text-xs leading-none">A</span>
            </div>
            <span className="font-display font-bold text-white text-sm tracking-wide leading-none">
              Asha <span className="text-asha-orange">Tri</span>
            </span>
            {isCoordLike && (
              <span className="text-xs bg-asha-orange/20 text-asha-orangeLight border border-asha-orange/30 px-2 py-1 rounded-full font-body font-medium leading-none whitespace-nowrap hidden sm:inline-flex">
                {isAthleteMode ? 'Athlete View' : (ROLE_LABELS[profile?.role] ?? 'Coordinator')}
              </span>
            )}
          </div>

          {/* Desktop primary nav */}
          <div className="hidden sm:flex items-center gap-1">
            {primaryLinks.map(({ key, to, label, icon: Icon }) => {
              const active = activeKey === key
              return (
                <Link
                  key={key}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium whitespace-nowrap transition-all ${
                    active ? 'bg-asha-orange text-white' : 'text-asha-muted hover:text-white hover:bg-asha-mid'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isCoordLike && (
              <button
                onClick={() => navigate(isAthleteMode ? '/coord' : '/athlete')}
                className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-body font-medium text-asha-muted hover:text-white hover:bg-asha-mid transition-all whitespace-nowrap"
              >
                <ArrowLeftRight size={13} />
                {isAthleteMode ? 'Coord View' : 'Athlete View'}
              </button>
            )}
            {profile?.photoURL && (
              <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-asha-mid flex-shrink-0" />
            )}
            <button onClick={handleLogout} className="hidden sm:flex p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all">
              <LogOut size={14} />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="sm:hidden p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Sub-nav bar (desktop) */}
        {subLinks.length > 0 && (
          <div className="border-t border-asha-mid/50 hidden sm:block">
            <div className="max-w-6xl mx-auto px-4 flex items-center gap-0.5 h-9">
              {subLinks.map(({ to, label }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-1 rounded-md text-xs font-body font-medium transition-all ${
                      active ? 'text-asha-orangeLight bg-asha-mid/60' : 'text-asha-muted hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-asha-dark flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 h-14 border-b border-asha-mid flex-shrink-0">
              <div className="flex items-center gap-2">
                {profile?.photoURL && (
                  <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-asha-mid" />
                )}
                <div>
                  <div className="font-body font-medium text-white text-sm leading-tight">{profile?.name?.split(' ')[0]}</div>
                  {isCoordLike && (
                    <div className="font-body text-xs text-asha-orange leading-tight">{isAthleteMode ? 'Athlete View' : (ROLE_LABELS[profile?.role] ?? 'Coordinator')}</div>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-asha-muted hover:text-white rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3">
              {primaryLinks.map(({ key, to, label, icon: Icon }) => {
                const active = activeKey === key
                const isSwagGroup = key === 'swag'
                const drawerSubLinks = inCoordMode ? coordSwagSub : athleteSwagSub

                return (
                  <div key={key}>
                    <button
                      onClick={() => handleNav(to)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium transition-all mb-0.5 ${
                        active ? 'bg-asha-orange text-white' : 'text-asha-muted hover:text-white hover:bg-asha-mid'
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                    {isSwagGroup && (
                      <div className="ml-4 mb-1 space-y-0.5">
                        {drawerSubLinks.map(sub => {
                          const subActive = location.pathname === sub.to
                          return (
                            <button
                              key={sub.to}
                              onClick={() => handleNav(sub.to)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-body font-medium transition-all ${
                                subActive ? 'text-asha-orange' : 'text-asha-muted hover:text-white'
                              }`}
                            >
                              {sub.icon && <sub.icon size={13} />}
                              {sub.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-3 pb-5 pt-3 border-t border-asha-mid flex-shrink-0 space-y-1">
              {isCoordLike && (
                <button
                  onClick={() => { navigate(isAthleteMode ? '/coord' : '/athlete'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium text-asha-muted hover:text-white hover:bg-asha-mid transition-all"
                >
                  <ArrowLeftRight size={16} />
                  {isAthleteMode ? 'Switch to Coord View' : 'Switch to Athlete View'}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium text-asha-muted hover:text-white hover:bg-asha-mid transition-all"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
