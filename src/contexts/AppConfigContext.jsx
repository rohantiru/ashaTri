import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const AppConfigContext = createContext({})

const DEFAULT_CONFIG = {
  tabs: { home: true, events: true, races: true, swag: true, expenses: true, training: false },
  ownerEmail: 'rohantirumale@gmail.com',
  trainingTeamId: null,
  trainingMemberIds: [],
}

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'main'))
        if (snap.exists()) {
          const data = snap.data()
          const base = {
            ...DEFAULT_CONFIG,
            ...data,
            tabs: { ...DEFAULT_CONFIG.tabs, ...data?.tabs },
          }

          // Resolve team membership dynamically — don't trust the stored snapshot
          if (base.trainingTeamId) {
            try {
              const teamSnap = await getDoc(doc(db, 'teams', base.trainingTeamId))
              base.trainingMemberIds = teamSnap.exists() ? (teamSnap.data().memberIds || []) : []
            } catch (_) {
              base.trainingMemberIds = []
            }
          } else {
            base.trainingMemberIds = []
          }

          setConfig(base)
        }
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  const updateTabs = async (tabs) => {
    const newConfig = { ...config, tabs: { ...config.tabs, ...tabs } }
    await setDoc(doc(db, 'appConfig', 'main'), newConfig)
    setConfig(newConfig)
  }

  const updateConfig = async (updates) => {
    const newConfig = { ...config, ...updates }
    await setDoc(doc(db, 'appConfig', 'main'), newConfig)
    setConfig(newConfig)
  }

  return (
    <AppConfigContext.Provider value={{ config, loading, updateTabs, updateConfig }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export const useAppConfig = () => useContext(AppConfigContext)
