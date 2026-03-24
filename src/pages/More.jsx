import { useNavigate, useLocation } from 'react-router-dom'
import {
  Activity, Receipt, Package, Users, Flag, Settings,
  BookOpen, ShoppingBag, BarChart2, CheckSquare,
  ArrowLeftRight, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuth, COORD_ROLES } from '../contexts/AuthContext'
import { useAppConfig } from '../contexts/AppConfigContext'

const COLOR_MAP = {
  orange: { bg: 'bg-asha-orangeDim',  icon: 'text-asha-orange'   },
  blue:   { bg: 'bg-blue-50',          icon: 'text-blue-500'      },
  purple: { bg: 'bg-purple-50',        icon: 'text-purple-500'    },
  green:  { bg: 'bg-emerald-50',       icon: 'text-emerald-600'   },
  teal:   { bg: 'bg-teal-50',          icon: 'text-teal-600'      },
  red:    { bg: 'bg-red-50',           icon: 'text-red-500'       },
  gray:   { bg: 'bg-gray-100',         icon: 'text-gray-500'      },
  amber:  { bg: 'bg-amber-50',         icon: 'text-amber-600'     },
}

function ProfileCard({ profile }) {
  const initials = profile?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <div className="flex items-center gap-3 mb-6 px-1">
      {profile?.photoURL ? (
        <img
          src={profile.photoURL}
          alt={profile.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-asha-border flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-asha-orangeDim border-2 border-asha-border flex items-center justify-center flex-shrink-0">
          <span className="font-display font-bold text-asha-orange text-lg leading-none">{initials}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="font-display font-bold text-asha-dark text-base leading-tight truncate">{profile?.name}</div>
        <div className="font-body text-xs text-asha-muted mt-0.5 truncate">{profile?.email}</div>
      </div>
    </div>
  )
}

function MenuSection({ title, children }) {
  return (
    <div className="mb-4">
      <div className="font-body text-[10px] font-semibold text-asha-muted tracking-widest uppercase px-1 mb-2">
        {title}
      </div>
      <div className="bg-asha-card rounded-2xl border border-asha-border overflow-hidden divide-y divide-asha-border">
        {children}
      </div>
    </div>
  )
}

function MenuRow({ icon: Icon, color = 'orange', label, to }) {
  const navigate = useNavigate()
  const { bg, icon: iconColor } = COLOR_MAP[color] ?? COLOR_MAP.orange
  return (
    <button
      onClick={() => navigate(to)}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-asha-cream transition-colors min-h-[44px]"
    >
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
      <span className="font-body font-medium text-sm text-asha-dark flex-1 text-left">{label}</span>
      <ChevronRight size={16} className="text-asha-muted flex-shrink-0" />
    </button>
  )
}

const ROLE_LABELS = {
  coordinator: 'Coordinator View',
  coach: 'Coach View',
  owner: 'Owner View',
}

export default function More() {
  const { user, profile, logout } = useAuth()
  const { config } = useAppConfig()
  const navigate = useNavigate()
  const location = useLocation()

  const isCoordLike = COORD_ROLES.includes(profile?.role)
  const isAthleteMode = location.pathname.startsWith('/athlete')
  const isOwner = profile?.role === 'owner' || user?.email === config.ownerEmail
  const isCoach = profile?.role === 'coach'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-asha-cream pb-24 sm:pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <ProfileCard profile={profile} />

        {/* ── Athlete menu (shown when in athlete mode) ── */}
        {isAthleteMode && (
          <MenuSection title="Athlete Menu">
            {config.tabs.training && (!config.trainingMemberIds?.length || config.trainingMemberIds.includes(user?.uid)) && (
              <MenuRow icon={Activity}  color="orange" label="Training & Strava"         to="/athlete/training" />
            )}
            {config.tabs.expenses && (
              <MenuRow icon={Receipt}   color="blue"   label="Expenses & Reimbursements" to="/athlete/expenses" />
            )}
            {config.tabs.swag && (
              <MenuRow icon={Package}   color="purple" label="My Swag"                   to="/athlete/my-swag" />
            )}
          </MenuSection>
        )}

        {/* ── Coach/Admin section (coordLike in athlete mode) ── */}
        {isAthleteMode && isCoordLike && (
          <MenuSection title="Coach / Admin">
            <MenuRow icon={Users}       color="teal"   label="Team Roster"       to="/coord/athletes" />
            <MenuRow icon={Flag}        color="red"    label="Race Management"   to="/coord/races" />
            <MenuRow icon={ShoppingBag} color="amber"  label="Swag Fulfillment"  to="/coord/items" />
            {isOwner && <MenuRow icon={Settings}    color="gray"   label="Team Settings"     to="/coord/settings" />}
          </MenuSection>
        )}

        {/* ── Coordinator manage section (coord mode) ── */}
        {!isAthleteMode && (
          <MenuSection title="Manage">
            {(isCoach || isOwner) && (
              <MenuRow icon={BookOpen}    color="teal"   label="Training Plans"  to="/coord/training-plans" />
            )}
            {!isCoach && (
              <>
                <MenuRow icon={Package}     color="orange" label="Swag — Items"    to="/coord/items" />
                <MenuRow icon={BarChart2}   color="blue"   label="Swag — Interest" to="/coord/interest" />
                <MenuRow icon={CheckSquare} color="green"  label="Swag — Pickup"   to="/coord/pickup" />
                <MenuRow icon={Receipt}     color="purple" label="Expenses"         to="/coord/expenses" />
              </>
            )}
            {isOwner && (
              <>
                <MenuRow icon={Users}    color="amber" label="User Management" to="/coord/users" />
                <MenuRow icon={Settings} color="gray"  label="Settings"        to="/coord/settings" />
              </>
            )}
          </MenuSection>
        )}

        {/* ── Switch view (coordLike only) ── */}
        {isCoordLike && (
          <button
            onClick={() => navigate(isAthleteMode ? '/coord' : '/athlete')}
            className="w-full flex items-center gap-3 px-4 py-4 bg-asha-card rounded-2xl border border-asha-border mb-3 min-h-[44px] hover:bg-asha-cream transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-asha-orangeDim flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight size={16} className="text-asha-orange" />
            </div>
            <span className="font-body font-medium text-sm text-asha-dark flex-1 text-left">
              {isAthleteMode
                ? `Switch to ${ROLE_LABELS[profile?.role] ?? 'Coordinator View'}`
                : 'Switch to Athlete View'}
            </span>
            <ChevronRight size={16} className="text-asha-muted flex-shrink-0" />
          </button>
        )}

        {/* ── Sign out ── */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-4 bg-asha-card rounded-2xl border border-asha-border min-h-[44px] hover:bg-red-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <LogOut size={16} className="text-red-500" />
          </div>
          <span className="font-body font-medium text-sm text-red-500 flex-1 text-left">Sign Out</span>
        </button>

      </div>
    </div>
  )
}
