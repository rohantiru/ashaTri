import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, LayoutDashboard, Package, BarChart2, CheckSquare, ShoppingBag, Star, ArrowLeftRight } from 'lucide-react'

const coordLinks = [
  { to: '/coord', label: 'Overview', icon: LayoutDashboard },
  { to: '/coord/items', label: 'Swag Items', icon: Package },
  { to: '/coord/interest', label: 'Interest', icon: BarChart2 },
  { to: '/coord/pickup', label: 'Pickup', icon: CheckSquare },
]

const athleteLinks = [
  { to: '/athlete', label: 'Home', icon: LayoutDashboard },
  { to: '/athlete/browse', label: 'Browse Swag', icon: ShoppingBag },
  { to: '/athlete/my-swag', label: 'My Swag', icon: Star },
]

export default function Navbar() {
  const { profile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isCoordinator = profile?.role === 'coordinator'
  const isAthleteMode = location.pathname.startsWith('/athlete')
  const links = isCoordinator ? (isAthleteMode ? athleteLinks : coordLinks) : athleteLinks

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 bg-asha-dark border-b border-asha-mid">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-asha-orange flex items-center justify-center">
            <span className="text-white font-display font-bold text-xs">A</span>
          </div>
          <span className="font-display font-bold text-white text-sm tracking-wide hidden sm:block">
            Asha <span className="text-asha-orange">Swag</span>
          </span>
          {isCoordinator && (
            <span className="text-xs bg-asha-orange/20 text-asha-orangeLight border border-asha-orange/30 px-2 py-0.5 rounded-full font-body font-medium">
              {isAthleteMode ? 'Athlete View' : 'Coordinator'}
            </span>
          )}
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                  active
                    ? 'bg-asha-orange text-white'
                    : 'text-asha-muted hover:text-white hover:bg-asha-mid'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:block">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-2">
          {isCoordinator && (
            <button
              onClick={() => navigate(isAthleteMode ? '/coord' : '/athlete')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-body font-medium text-asha-muted hover:text-white hover:bg-asha-mid transition-all"
              title={isAthleteMode ? 'Switch to Coord View' : 'Switch to Athlete View'}
            >
              <ArrowLeftRight size={13} />
              <span className="hidden sm:block">{isAthleteMode ? 'Coord View' : 'Athlete View'}</span>
            </button>
          )}
          {profile?.photoURL && (
            <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border border-asha-mid" />
          )}
          <span className="text-asha-muted text-xs hidden md:block font-body">{profile?.name?.split(' ')[0]}</span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-asha-muted hover:text-white hover:bg-asha-mid rounded-lg transition-all"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}
