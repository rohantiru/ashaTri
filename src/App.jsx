import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AppConfigProvider, useAppConfig } from './contexts/AppConfigContext'
import Login from './pages/Login'
import CoordinatorDashboard from './pages/coordinator/Dashboard'
import SwagItems from './pages/coordinator/SwagItems'
import InterestView from './pages/coordinator/InterestView'
import PickupManager from './pages/coordinator/PickupManager'
import ExpensesSummary from './pages/coordinator/ExpensesSummary'
import Settings from './pages/coordinator/Settings'
import UserManagement from './pages/coordinator/UserManagement'
import AthleteDashboard from './pages/athlete/Dashboard'
import SwagBrowse from './pages/athlete/SwagBrowse'
import MySwag from './pages/athlete/MySwag'
import Expenses from './pages/athlete/Expenses'
import Navbar from './components/Navbar'

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'coordinator') return children
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

  if (loading || configLoading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-asha-cream">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={profile?.role === 'coordinator' ? '/coord' : '/athlete'} replace />} />

        {/* Coordinator routes */}
        <Route path="/coord" element={<ProtectedRoute role="coordinator"><CoordinatorDashboard /></ProtectedRoute>} />
        <Route path="/coord/items" element={<ProtectedRoute role="coordinator"><SwagItems /></ProtectedRoute>} />
        <Route path="/coord/interest" element={<ProtectedRoute role="coordinator"><InterestView /></ProtectedRoute>} />
        <Route path="/coord/pickup" element={<ProtectedRoute role="coordinator"><PickupManager /></ProtectedRoute>} />
        <Route path="/coord/expenses" element={<ProtectedRoute role="coordinator"><ExpensesSummary /></ProtectedRoute>} />
        <Route path="/coord/settings" element={<ProtectedRoute role="coordinator"><Settings /></ProtectedRoute>} />
        <Route path="/coord/users" element={<ProtectedRoute role="coordinator"><UserManagement /></ProtectedRoute>} />

        {/* Athlete routes — gated by tab config */}
        <Route path="/athlete" element={<ProtectedRoute role="athlete"><AthleteDashboard /></ProtectedRoute>} />
        {config.tabs.swag && (
          <>
            <Route path="/athlete/browse" element={<ProtectedRoute role="athlete"><SwagBrowse /></ProtectedRoute>} />
            <Route path="/athlete/my-swag" element={<ProtectedRoute role="athlete"><MySwag /></ProtectedRoute>} />
          </>
        )}
        {config.tabs.expenses && (
          <Route path="/athlete/expenses" element={<ProtectedRoute role="athlete"><Expenses /></ProtectedRoute>} />
        )}

        <Route path="*" element={<Navigate to={user ? (profile?.role === 'coordinator' ? '/coord' : '/athlete') : '/login'} replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AppConfigProvider>
      <AppRoutes />
    </AppConfigProvider>
  )
}
