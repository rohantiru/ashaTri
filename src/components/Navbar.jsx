import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'
import {
  LogOut, LayoutDashboard, Package, BarChart2, CheckSquare,
  ShoppingBag, Star, ArrowLeftRight, Receipt, Settings, Users, Menu, X
} from 'lucide-react'

const coordLinks = [
  { to: '/coord', label: 'Overview', icon: LayoutDashboard },
  { to: '/coord/items', label: 'Swag Items', icon: Package },
  { to: '/coord/interest', label: 'Interest', icon: BarChart2 },
  { to: '/coord/pickup', label: 'Pickup', icon: CheckSquare },
  { to: '/coord/expenses', label: 'Expenses', icon: Receipt },
  { to: '/coord/users', label: 'Users', icon: Users },
  { to: '/coord/settings', label: 'Settings', icon: Settings },
]

const allAthleteLinks = [
  { to: '/athlete', label: 'Home', icon: LayoutDashboard, tab: null },
  { to: '/athlete/browse', label: 'Browse Swag', icon: ShoppingBag, tab: 'swag' },
  { to: '/athlete/my-swag', label: 'My Swag', icon: Star, tab: 'swag' },
  { to: '/athlete/expenses', label: 'Expenses', icon: Receipt, tab: 'expenses' },
]

export default function Navbar() {
  const { profile, logout } = useAuth()
  const { config } = useAppConfig()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isCoordinator = profile?.role === 'coordinator'
  const isAthleteMode = location.pathname.startsWith('/athlete')

  const athleteLinks = allAthleteLinks.filter(l => !l.tab || config.tabs[l.tab])
  const links = isCoordinator ? (isAthleteMode ? athleteLinks : coordLinks) : athleteLinks

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
            {isCoordinator && (
              <span className="text-xs bg-asha-orange/20 text-asha-orangeLight border border-asha-orange/30 px-2 py-1 rounded-full font-body font-medium leading-none whitespace-nowrap hidden sm:inline-flex">
                {isAthleteMode ? 'Athlete View' : 'Coordinator'}
              </span>
            )}
          </div>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
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
            {/* Desktop: mode toggle + avatar + logout */}
            {isCoordinator && (
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
            {/* Mobile: hamburger */}
            <button
              onClick={() => setOpen(true)}
              className="sm:hidden p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] sm:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Drawer */}
          <div className="absolute top-0 right-0 h-full w-72 bg-asha-dark flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-asha-mid flex-shrink-0">
              <div className="flex items-center gap-2">
                {profile?.photoURL && (
                  <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-asha-mid" />
                )}
                <div>
                  <div className="font-body font-medium text-white text-sm leading-tight">{profile?.name?.split(' ')[0]}</div>
                  {isCoordinator && (
                    <div className="font-body text-xs text-asha-orange leading-tight">{isAthleteMode ? 'Athlete View' : 'Coordinator'}</div>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-asha-muted hover:text-white rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {links.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to
                return (
                  <button
                    key={to}
                    onClick={() => handleNav(to)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-body font-medium transition-all mb-1 ${
                      active ? 'bg-asha-orange text-white' : 'text-asha-muted hover:text-white hover:bg-asha-mid'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Drawer footer */}
            <div className="px-3 pb-5 pt-3 border-t border-asha-mid flex-shrink-0 space-y-1">
              {isCoordinator && (
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
