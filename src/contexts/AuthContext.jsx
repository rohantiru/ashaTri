import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'

// Roles that have coordinator-level access
export const COORD_ROLES = ['coordinator', 'coach', 'owner']

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // Firebase Auth user
  const [profile, setProfile] = useState(null) // Firestore user doc
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)

        if (!snap.exists()) {
          // First sign-in: check ownerEmail from appConfig to auto-assign owner role
          let role = 'athlete'
          try {
            const configSnap = await getDoc(doc(db, 'appConfig', 'main'))
            const ownerEmail = configSnap.exists()
              ? (configSnap.data().ownerEmail || 'rohantirumale@gmail.com')
              : 'rohantirumale@gmail.com'
            if (firebaseUser.email === ownerEmail) role = 'owner'
          } catch (_) {}

          const newProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            role,
            isMentor: role === 'coach' || role === 'owner',
            createdAt: serverTimestamp(),
          }
          await setDoc(ref, newProfile)
          setProfile(newProfile)
        } else {
          setProfile(snap.data())
        }
        setUser(firebaseUser)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
