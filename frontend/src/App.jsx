import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store'
import { onAuthStateChange } from './lib/supabase'

import Layout from './components/Layout'
import Toast from './components/Toast'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import SavedPage from './pages/SavedPage'
import WatchlistsPage from './pages/WatchlistsPage'
import AlertsPage from './pages/AlertsPage'
import HistoryPage from './pages/HistoryPage'
import HistoryDetailPage from './pages/HistoryDetailPage'
import SettingsPage from './pages/SettingsPage'

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  // In demo mode, always allow access
  if (!user && !DEMO_MODE) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { setUser, clearUser } = useAuthStore()

  // Sync Supabase auth state
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user, session)
      } else if (!DEMO_MODE) {
        clearUser()
      } else {
        // Demo mode — set a fake user so the UI doesn't redirect
        setUser({ email: 'demo@tenderwatch.in', id: '00000000-0000-0000-0000-000000000001' }, null)
      }
    })
    // In demo mode, immediately set a fake user
    if (DEMO_MODE) {
      setUser({ email: 'demo@tenderwatch.in', id: '00000000-0000-0000-0000-000000000001' }, null)
    }
    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected app routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/saved" element={
          <ProtectedRoute>
            <Layout><SavedPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/watchlists" element={
          <ProtectedRoute>
            <Layout><WatchlistsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/alerts" element={
          <ProtectedRoute>
            <Layout><AlertsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/history" element={
          <ProtectedRoute>
            <Layout><HistoryPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/history/:id" element={
          <ProtectedRoute>
            <Layout><HistoryDetailPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/settings" element={
          <ProtectedRoute>
            <Layout><SettingsPage /></Layout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  )
}
