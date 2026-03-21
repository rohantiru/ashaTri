import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const AppConfigContext = createContext({})

const DEFAULT_CONFIG = {
  tabs: { home: true, events: true, races: true, swag: true, expenses: true, training: false },
  ownerEmail: 'rohantirumale@gmail.com',
}

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'main'))
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data(), tabs: { ...DEFAULT_CONFIG.tabs, ...snap.data()?.tabs } })
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

  return (
    <AppConfigContext.Provider value={{ config, loading, updateTabs }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export const useAppConfig = () => useContext(AppConfigContext)
