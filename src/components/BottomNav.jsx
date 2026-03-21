import { Link, useLocation } from 'react-router-dom'
import {
  Home, Trophy, Shirt, CalendarDays, MoreHorizontal,
  LayoutDashboard, Users, Flag,
} from 'lucide-react'
import { useAuth, COORD_ROLES } from '../contexts/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'

function TabButton({ tab, active }) {
  const { icon: Icon, label, to } = tab
  return (
    <Link
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
    >
      <Icon
        size={20}
        strokeWidth={active ? 2.5 : 1.5}
        className={active ? 'text-asha-orange' : 'text-asha-muted'}
      />
      <span className={`font-body text-[10px] font-medium leading-none ${active ? 'text-asha-orange' : 'text-asha-muted'}`}>
        {label}
      </span>
    </Link>
  )
}

export default function BottomNav() {
  const { profile } = useAuth()
  const { config } = useAppConfig()
  const location = useLocation()
  const p = location.pathname

  const isCoordLike = COORD_ROLES.includes(profile?.role)
  const isAthleteMode = p.startsWith('/athlete')
  const isCoordinator = profile?.role === 'coordinator'

  // Pages reachable only via More — keep More tab lit on these paths
  const athleteMorePaths = ['/athlete/more', '/athlete/expenses', '/athlete/my-swag', ...(config.tabs.training ? ['/athlete/training'] : [])]
  const coordMorePaths = [
    '/coord/more', '/coord/training-plans', '/coord/items',
    '/coord/interest', '/coord/pickup', '/coord/expenses',
    '/coord/settings', '/coord/users',
  ]

  if (!isAthleteMode && !isCoordLike) return null

  if (!isAthleteMode && isCoordLike) {
    // ── Coordinator bottom nav ────────────────────────────────────────────────
    const moreActive = coordMorePaths.includes(p)
    const activeKey = (() => {
      if (moreActive) return 'more'
      if (p === '/coord') return 'overview'
      if (p === '/coord/athletes') return 'athletes'
      if (p === '/coord/races') return 'races'
      if (p === '/coord/events') return 'events'
      return ''
    })()

    const tabs = [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/coord' },
      ...(!isCoordinator ? [{ key: 'athletes', label: 'Athletes', icon: Users, to: '/coord/athletes' }] : []),
      { key: 'races', label: 'Races', icon: Flag, to: '/coord/races' },
      { key: 'events', label: 'Events', icon: CalendarDays, to: '/coord/events' },
      { key: 'more', label: 'More', icon: MoreHorizontal, to: '/coord/more' },
    ]

    return (
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-asha-card border-t border-asha-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-14">
          {tabs.map(tab => (
            <TabButton key={tab.key} tab={tab} active={activeKey === tab.key} />
          ))}
        </div>
      </nav>
    )
  }

  // ── Athlete bottom nav ──────────────────────────────────────────────────────
  const moreActive = athleteMorePaths.includes(p)
  const activeKey = (() => {
    if (moreActive) return 'more'
    if (p === '/athlete') return 'home'
    if (p === '/athlete/races') return 'races'
    if (p === '/athlete/browse') return 'swag'
    if (p === '/athlete/events') return 'events'
    return ''
  })()

  const featureTabs = [
    ...(config.tabs.home   ? [{ key: 'home',   label: 'Home',   icon: Home,         to: '/athlete' }]         : []),
    ...(config.tabs.races  ? [{ key: 'races',  label: 'Races',  icon: Trophy,       to: '/athlete/races' }]   : []),
    ...(config.tabs.swag   ? [{ key: 'swag',   label: 'Swag',   icon: Shirt,        to: '/athlete/browse' }]  : []),
    ...(config.tabs.events ? [{ key: 'events', label: 'Events', icon: CalendarDays, to: '/athlete/events' }]  : []),
  ]
  const tabs = [...featureTabs.slice(0, 4), { key: 'more', label: 'More', icon: MoreHorizontal, to: '/athlete/more' }]

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-asha-card border-t border-asha-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map(tab => (
          <TabButton key={tab.key} tab={tab} active={activeKey === tab.key} />
        ))}
      </div>
    </nav>
  )
}
