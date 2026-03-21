import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, COORD_ROLES } from '../contexts/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'
import { useSidebar } from '../contexts/SidebarContext'
import {
  LogOut, LayoutDashboard, ShoppingBag, Flag, Receipt, Settings,
  Users, ArrowLeftRight, BarChart2, CheckSquare, Package, Calendar, Activity, BookOpen,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

const ROLE_LABELS = {
  coordinator: 'Coordinator View',
  coach: 'Coach View',
  owner: 'Owner View',
}

export default function Sidebar() {
  const { user, profile, logout } = useAuth()
  const { config } = useAppConfig()
  const { collapsed, toggleCollapsed } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) return null

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  const isCoordLike = COORD_ROLES.includes(profile?.role)
  const isAthleteMode = location.pathname.startsWith('/athlete')
  const isOwner = profile?.role === 'owner' || user?.email === config.ownerEmail

  // ── Athlete nav ──────────────────────────────────────────────────────────
  const swagEnabled = config.tabs.swag
  const expensesEnabled = config.tabs.expenses
  const homeEnabled = config.tabs.home
  const eventsEnabled = config.tabs.events
  const racesEnabled = config.tabs.races

  const athletePrimary = [
    ...(homeEnabled ? [{ key: 'home', label: 'Home', icon: LayoutDashboard, to: '/athlete' }] : []),
    ...(eventsEnabled ? [{ key: 'events', label: 'Events', icon: Calendar, to: '/athlete/events' }] : []),
    ...(swagEnabled ? [{ key: 'swag', label: 'Swag', icon: ShoppingBag, to: '/athlete/browse' }] : []),
    ...(racesEnabled ? [{ key: 'races', label: 'Races', icon: Flag, to: '/athlete/races' }] : []),
    ...(expensesEnabled ? [{ key: 'expenses', label: 'Expenses', icon: Receipt, to: '/athlete/expenses' }] : []),
    { key: 'training', label: 'Training', icon: Activity, to: '/athlete/training' },
  ]

  const athleteSwagSub = swagEnabled ? [
    { to: '/athlete/browse', label: 'Browse' },
    { to: '/athlete/my-swag', label: 'My Swag' },
  ] : []

  const inAthleteSwag = ['/athlete/browse', '/athlete/my-swag'].includes(location.pathname)

  const athleteActiveKey = (() => {
    const p = location.pathname
    if (p === '/athlete') return 'home'
    if (p === '/athlete/events') return 'events'
    if (inAthleteSwag) return 'swag'
    if (p === '/athlete/races') return 'races'
    if (p === '/athlete/expenses') return 'expenses'
    if (p === '/athlete/training') return 'training'
    return ''
  })()

  // ── Coordinator nav ──────────────────────────────────────────────────────
  const isCoach = profile?.role === 'coach'
  const isCoordinator = profile?.role === 'coordinator'

  const coordPrimary = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/coord' },
    ...(!isCoach ? [{ key: 'swag', label: 'Swag', icon: ShoppingBag, to: '/coord/items' }] : []),
    { key: 'races', label: 'Races', icon: Flag, to: '/coord/races' },
    ...(!isCoordinator ? [{ key: 'athletes', label: 'Athletes', icon: Users, to: '/coord/athletes' }] : []),
    { key: 'events', label: 'Events', icon: Calendar, to: '/coord/events' },
    ...(!isCoach ? [{ key: 'expenses', label: 'Expenses', icon: Receipt, to: '/coord/expenses' }] : []),
    ...((isCoach || isOwner) ? [{ key: 'training-plans', label: 'Training Plans', icon: BookOpen, to: '/coord/training-plans' }] : []),
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
    if (p === '/coord/events') return 'events'
    if (p === '/coord/expenses') return 'expenses'
    if (p === '/coord/training-plans') return 'training-plans'
    if (p === '/coord/settings') return 'settings'
    if (p === '/coord/users') return 'users'
    return ''
  })()

  // ── Active set ───────────────────────────────────────────────────────────
  const inCoordMode = isCoordLike && !isAthleteMode
  const primaryLinks = inCoordMode ? coordPrimary : athletePrimary
  const activeKey = inCoordMode ? coordActiveKey : athleteActiveKey

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 bg-asha-dark border-r border-asha-mid transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Brand section */}
      <div className="h-14 border-b border-asha-mid flex items-center flex-shrink-0 px-3">
        {collapsed ? (
          <div className="w-8 h-8 rounded-full bg-asha-orange flex items-center justify-center mx-auto flex-shrink-0">
            <span className="text-white font-body font-bold text-sm leading-none">A</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-asha-orange flex items-center justify-center flex-shrink-0">
              <span className="text-white font-body font-bold text-sm leading-none">A</span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-display font-bold text-white text-sm tracking-wide leading-none truncate">
                Asha <span className="text-asha-orange">Tri</span>
              </span>
              {isCoordLike && (
                <span className="text-[9px] text-asha-orangeLight font-body font-medium leading-none mt-0.5 truncate">
                  {isAthleteMode ? 'Athlete View' : (ROLE_LABELS[profile?.role] ?? 'Coordinator')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {primaryLinks.map(({ key, to, label, icon: Icon }) => {
          const active = activeKey === key
          if (collapsed) {
            return (
              <div key={key}>
                <Link
                  to={to}
                  title={label}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-all ${
                    active ? 'bg-asha-orange text-white' : 'text-asha-muted hover:text-white hover:bg-asha-mid'
                  }`}
                >
                  <Icon size={18} />
                </Link>
              </div>
            )
          }

          return (
            <div key={key}>
              <Link
                to={to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 font-body text-sm font-medium transition-all ${
                  active ? 'bg-asha-orange text-white' : 'text-asha-muted hover:text-white hover:bg-asha-mid'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>

              {/* Coord swag sub-links when expanded and swag is active */}
              {inCoordMode && key === 'swag' && inCoordSwag && (
                <div className="mt-0.5 space-y-0.5">
                  {coordSwagSub.map(({ to: subTo, label: subLabel }) => {
                    const subActive = location.pathname === subTo
                    return (
                      <Link
                        key={subTo}
                        to={subTo}
                        className={`flex items-center gap-2 pl-10 pr-4 py-1.5 rounded-lg mx-2 font-body text-xs font-medium transition-all ${
                          subActive ? 'text-asha-orangeLight bg-asha-mid/60' : 'text-asha-muted hover:text-white'
                        }`}
                      >
                        {subLabel}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Athlete swag sub-links when expanded and swag is active */}
              {!inCoordMode && key === 'swag' && inAthleteSwag && (
                <div className="mt-0.5 space-y-0.5">
                  {athleteSwagSub.map(({ to: subTo, label: subLabel }) => {
                    const subActive = location.pathname === subTo
                    return (
                      <Link
                        key={subTo}
                        to={subTo}
                        className={`flex items-center gap-2 pl-10 pr-4 py-1.5 rounded-lg mx-2 font-body text-xs font-medium transition-all ${
                          subActive ? 'text-asha-orangeLight bg-asha-mid/60' : 'text-asha-muted hover:text-white'
                        }`}
                      >
                        {subLabel}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 border-t border-asha-mid p-3 space-y-1">
        {/* View switch (coord users only) */}
        {isCoordLike && (
          collapsed ? (
            <button
              onClick={() => navigate(isAthleteMode ? '/coord' : '/athlete')}
              title={isAthleteMode ? (ROLE_LABELS[profile?.role] ?? 'Coord View') : 'Athlete View'}
              className="flex items-center justify-center w-10 h-10 rounded-lg mx-auto text-asha-muted hover:text-white hover:bg-asha-mid transition-all"
            >
              <ArrowLeftRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => navigate(isAthleteMode ? '/coord' : '/athlete')}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg font-body text-sm font-medium text-asha-muted hover:text-white hover:bg-asha-mid transition-all"
            >
              <ArrowLeftRight size={16} />
              {isAthleteMode ? (ROLE_LABELS[profile?.role] ?? 'Coord View') : 'Athlete View'}
            </button>
          )
        )}

        {/* User row */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-8 h-8 rounded-full object-cover border border-asha-mid" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-asha-orange/20 border border-asha-orange/30 flex items-center justify-center">
                <span className="font-body font-bold text-asha-orangeLight text-xs leading-none">{initials}</span>
              </div>
            )}
            <button onClick={handleLogout} title="Log out" className="p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-asha-mid flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-asha-orange/20 border border-asha-orange/30 flex items-center justify-center flex-shrink-0">
                <span className="font-body font-bold text-asha-orangeLight text-xs leading-none">{initials}</span>
              </div>
            )}
            <span className="font-body text-sm text-asha-muted truncate flex-1">{profile?.name ?? 'User'}</span>
            <button onClick={handleLogout} title="Log out" className="p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all flex-shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-asha-mid/40 hover:bg-asha-orange/20 transition-colors mx-auto mb-2"
      >
        {collapsed ? <ChevronRight size={14} className="text-asha-muted" /> : <ChevronLeft size={14} className="text-asha-muted" />}
      </button>
    </aside>
  )
}
