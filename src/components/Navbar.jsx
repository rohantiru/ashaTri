import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, COORD_ROLES } from '../contexts/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'
import {
  LogOut, LayoutDashboard, ShoppingBag, Flag, Receipt, Settings,
  Users, ArrowLeftRight, BarChart2, CheckSquare, Package, Calendar, Activity, BookOpen,
} from 'lucide-react'

const MOBILE_TITLES = {
  '/athlete': 'Home', '/athlete/races': 'Races', '/athlete/browse': 'Browse Swag',
  '/athlete/my-swag': 'My Swag', '/athlete/events': 'Events', '/athlete/expenses': 'Expenses',
  '/athlete/training': 'Training', '/athlete/more': 'More',
  '/coord': 'Overview', '/coord/athletes': 'Team Roster', '/coord/races': 'Race Management',
  '/coord/events': 'Events', '/coord/items': 'Swag Items', '/coord/interest': 'Swag Interest',
  '/coord/pickup': 'Pickup', '/coord/expenses': 'Expenses',
  '/coord/training-plans': 'Training Plans', '/coord/settings': 'Settings',
  '/coord/users': 'Users', '/coord/more': 'More',
}

const ROLE_LABELS = {
  coordinator: 'Coordinator View',
  coach: 'Coach View',
  owner: 'Owner View',
}

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const { config } = useAppConfig()
  const location = useLocation()
  const navigate = useNavigate()

  const mobilePageTitle = MOBILE_TITLES[location.pathname] ?? 'Asha Tri'
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
  const subLinks = inCoordMode
    ? (inCoordSwag ? coordSwagSub : [])
    : (inAthleteSwag ? athleteSwagSub : [])
  const activeKey = inCoordMode ? coordActiveKey : athleteActiveKey

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-asha-dark border-b border-asha-mid">

      {/* Mobile top bar */}
      <div className="sm:hidden flex items-center justify-between h-14 px-4">
        <span className="font-display font-bold text-white text-base">{mobilePageTitle}</span>
        {profile?.photoURL ? (
          <img src={profile.photoURL} alt={profile.name} className="w-8 h-8 rounded-full object-cover border border-asha-mid flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-asha-orange/20 border border-asha-orange/30 flex items-center justify-center flex-shrink-0">
            <span className="font-body font-bold text-asha-orangeLight text-xs leading-none">{initials}</span>
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:block lg:hidden">
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
              <span className="text-[10px] bg-asha-orange/20 text-asha-orangeLight border border-asha-orange/30 px-1.5 py-0.5 rounded-full font-body font-medium leading-none whitespace-nowrap">
                {isAthleteMode ? 'Athlete View' : (ROLE_LABELS[profile?.role] ?? 'Coordinator')}
              </span>
            )}
          </div>

          {/* Desktop primary nav */}
          <div className="flex items-center gap-1">
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
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-body font-medium text-asha-muted hover:text-white hover:bg-asha-mid transition-all whitespace-nowrap"
              >
                <ArrowLeftRight size={13} />
                {isAthleteMode ? (ROLE_LABELS[profile?.role] ?? 'Coord View') : 'Athlete View'}
              </button>
            )}
            {profile?.photoURL && (
              <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-asha-mid flex-shrink-0" />
            )}
            <button onClick={handleLogout} className="p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Sub-nav bar (desktop only) */}
        {subLinks.length > 0 && (
          <div className="border-t border-asha-mid/50">
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
      </div>

    </nav>
  )
}
