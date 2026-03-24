import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, COORD_ROLES } from './contexts/AuthContext'
import { AppConfigProvider, useAppConfig } from './contexts/AppConfigContext'
import Login from './pages/Login'
import CoordinatorDashboard from './pages/coordinator/Dashboard'
import SwagItems from './pages/coordinator/SwagItems'
import InterestView from './pages/coordinator/InterestView'
import PickupManager from './pages/coordinator/PickupManager'
import ExpensesSummary from './pages/coordinator/ExpensesSummary'
import Settings from './pages/coordinator/Settings'
import UserManagement from './pages/coordinator/UserManagement'
import AthletesPage from './pages/coordinator/Athletes'
import EventsPage from './pages/coordinator/Events'
import AthleteDashboard from './pages/athlete/Dashboard'
import SwagBrowse from './pages/athlete/SwagBrowse'
import MySwag from './pages/athlete/MySwag'
import Expenses from './pages/athlete/Expenses'
import AthleteRaces from './pages/athlete/Races'
import AthleteEvents from './pages/athlete/Events'
import RaceManagement from './pages/coordinator/RaceManagement'
import TrainingCalendar from './pages/coordinator/TrainingCalendar'
import TrainingPlans from './pages/coordinator/TrainingPlans'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import More from './pages/More'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (COORD_ROLES.includes(profile?.role)) return children
  if (role === 'coordinator') return <Navigate to="/athlete" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-asha-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-asha-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-display text-asha-muted text-sm tracking-widest uppercase">Loading</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  const { config, loading: configLoading } = useAppConfig()
  const { collapsed } = useSidebar()

  if (loading || configLoading) return <LoadingScreen />

  const isOwner = profile?.role === 'owner' || user?.email === config.ownerEmail
  const isCoordLike = COORD_ROLES.includes(profile?.role)

  return (
    <div className="min-h-screen bg-asha-cream">
      {user && <Navbar />}
      {user && <Sidebar />}
      {user && <BottomNav />}
      <div className={`pb-20 sm:pb-0 lg:transition-all lg:duration-200 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={isCoordLike ? '/coord' : '/athlete'} replace />} />

        {/* Coordinator routes */}
        <Route path="/coord" element={<ProtectedRoute role="coordinator"><CoordinatorDashboard /></ProtectedRoute>} />
        <Route path="/coord/items" element={<ProtectedRoute role="coordinator"><SwagItems /></ProtectedRoute>} />
        <Route path="/coord/interest" element={<ProtectedRoute role="coordinator"><InterestView /></ProtectedRoute>} />
        <Route path="/coord/pickup" element={<ProtectedRoute role="coordinator"><PickupManager /></ProtectedRoute>} />
        <Route path="/coord/expenses" element={<ProtectedRoute role="coordinator"><ExpensesSummary /></ProtectedRoute>} />
        <Route path="/coord/races" element={<ProtectedRoute role="coordinator"><RaceManagement /></ProtectedRoute>} />
        <Route path="/coord/athletes" element={<ProtectedRoute role="coordinator"><AthletesPage /></ProtectedRoute>} />
        <Route path="/coord/events" element={<ProtectedRoute role="coordinator"><EventsPage /></ProtectedRoute>} />
        <Route path="/coord/settings" element={
          <ProtectedRoute role="coordinator">
            {isOwner ? <Settings /> : <Navigate to="/coord" replace />}
          </ProtectedRoute>
        } />
        <Route path="/coord/users" element={
          <ProtectedRoute role="coordinator">
            {isOwner ? <UserManagement /> : <Navigate to="/coord" replace />}
          </ProtectedRoute>
        } />
        <Route path="/coord/training" element={<Navigate to="/athlete/training" replace />} />
        <Route path="/coord/training-plans" element={
          <ProtectedRoute role="coordinator">
            <TrainingPlans />
          </ProtectedRoute>
        } />

        {/* Athlete routes — gated by tab config */}
        <Route path="/athlete" element={<ProtectedRoute role="athlete"><AthleteDashboard /></ProtectedRoute>} />
        {config.tabs.swag && (
          <>
            <Route path="/athlete/browse" element={<ProtectedRoute role="athlete"><SwagBrowse /></ProtectedRoute>} />
            <Route path="/athlete/my-swag" element={<ProtectedRoute role="athlete"><MySwag /></ProtectedRoute>} />
          </>
        )}
        {config.tabs.events && (
          <Route path="/athlete/events" element={<ProtectedRoute role="athlete"><AthleteEvents /></ProtectedRoute>} />
        )}
        {config.tabs.races && (
          <Route path="/athlete/races" element={<ProtectedRoute role="athlete"><AthleteRaces /></ProtectedRoute>} />
        )}
        {config.tabs.expenses && (
          <Route path="/athlete/expenses" element={<ProtectedRoute role="athlete"><Expenses /></ProtectedRoute>} />
        )}
        {config.tabs.training && (!config.trainingMemberIds?.length || config.trainingMemberIds.includes(user?.uid)) && (
          <Route path="/athlete/training" element={<ProtectedRoute role="athlete"><TrainingCalendar /></ProtectedRoute>} />
        )}
        <Route path="/athlete/more" element={<ProtectedRoute role="athlete"><More /></ProtectedRoute>} />
        <Route path="/coord/more" element={<ProtectedRoute role="coordinator"><More /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={user ? (isCoordLike ? '/coord' : '/athlete') : '/login'} replace />} />
      </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppConfigProvider>
      <SidebarProvider>
        <AppRoutes />
      </SidebarProvider>
    </AppConfigProvider>
  )
}
