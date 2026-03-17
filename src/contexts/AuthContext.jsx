import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'

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
          // First sign-in: create profile, default role = athlete
          const newProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            role: 'athlete', // coordinators manually upgraded in Firestore
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
