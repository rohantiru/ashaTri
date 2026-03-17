import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      const messages = {
        'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups for this site.',
        'auth/popup-closed-by-user': 'Sign-in cancelled.',
        'auth/unauthorized-domain': 'This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.',
        'auth/operation-not-allowed': 'Google Sign-In is not enabled in Firebase Console. Go to Authentication → Sign-in method → Google.',
        'auth/cancelled-popup-request': 'Another sign-in popup is already open.',
      }
      setError(messages[e.code] || `Sign-in failed: ${e.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-asha-dark flex items-center justify-center p-4">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-asha-orange mx-auto flex items-center justify-center mb-4 shadow-lg shadow-orange-900/40">
            <span className="font-display font-black text-white text-2xl">A</span>
          </div>
          <h1 className="font-display font-bold text-white text-3xl">Asha for Education</h1>
          <p className="text-asha-muted font-body text-sm mt-1">Triathlon Program — Swag Portal</p>
        </div>

        {/* Card */}
        <div className="bg-asha-mid/60 backdrop-blur rounded-2xl border border-white/10 p-8">
          <p className="font-body text-asha-muted text-sm text-center mb-6 leading-relaxed">
            Sign in with your Google account to access the swag portal. Athletes and coordinators use the same login.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm font-body text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-body font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>

        <p className="text-center text-asha-muted/50 text-xs font-body mt-6">
          Asha for Education Triathlon Program
        </p>
      </div>
    </div>
  )
}
