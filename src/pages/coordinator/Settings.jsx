import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAppConfig } from '../../contexts/AppConfigContext'
import { Settings as SettingsIcon, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

function Toggle({ enabled, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-asha-border last:border-0">
      <div>
        <div className="font-body font-medium text-sm text-asha-dark">{label}</div>
        <div className="font-body text-xs text-asha-muted mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${enabled ? 'bg-asha-orange' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function CalendarSettings() {
  const [creds, setCreds] = useState({ clientId: '', clientSecret: '', refreshToken: '' })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'secrets', 'googleCalendar'))
        if (snap.exists()) {
          const data = snap.data()
          setCreds({ clientId: data.clientId || '', clientSecret: data.clientSecret || '', refreshToken: data.refreshToken || '' })
          setConfigured(!!(data.clientId && data.clientSecret && data.refreshToken))
        }
      } catch (_) {}
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await setDoc(doc(db, 'secrets', 'googleCalendar'), creds)
    setConfigured(!!(creds.clientId && creds.clientSecret && creds.refreshToken))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const set = (k, v) => setCreds(c => ({ ...c, [k]: v }))

  return (
    <div className="bg-white rounded-2xl border border-asha-border p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-asha-orange" />
          <h2 className="font-display font-semibold text-asha-dark">Google Calendar</h2>
        </div>
        {configured
          ? <span className="flex items-center gap-1 text-xs font-body text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle2 size={11} />Configured</span>
          : <span className="flex items-center gap-1 text-xs font-body text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><AlertCircle size={11} />Not set up</span>}
      </div>
      <p className="font-body text-xs text-asha-muted mb-4">
        Paste the credentials from your OAuth setup. Calendar invites will be sent from the authenticated account.
      </p>

      <div className="space-y-3">
        {[
          { key: 'clientId', label: 'Client ID' },
          { key: 'clientSecret', label: 'Client Secret' },
          { key: 'refreshToken', label: 'Refresh Token' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-body font-medium text-asha-muted mb-1.5 uppercase tracking-wide">{label}</label>
            <input
              type="password"
              value={creds[key]}
              onChange={e => set(key, e.target.value)}
              placeholder={`Paste ${label.toLowerCase()}…`}
              className="w-full border border-asha-border rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-asha-orange transition-colors font-mono"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-asha-orange text-white font-body font-medium text-sm hover:bg-asha-orangeLight transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Credentials'}
        </button>
        {saved && <span className="font-body text-sm text-green-600 flex items-center gap-1"><CheckCircle2 size={14} />Saved</span>}
      </div>
    </div>
  )
}

export default function Settings() {
  const { config, updateTabs } = useAppConfig()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-asha-dark">Settings</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Control what athletes can see and configure integrations</p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="bg-white rounded-2xl border border-asha-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon size={16} className="text-asha-orange" />
            <h2 className="font-display font-semibold text-asha-dark">Athlete Tabs</h2>
          </div>
          <p className="font-body text-xs text-asha-muted mb-4">Toggle which sections are visible to athletes. Changes take effect immediately.</p>

          <Toggle label="Home"    desc="Athlete home dashboard"                                    enabled={config.tabs.home}    onChange={val => updateTabs({ home: val })} />
          <Toggle label="Events"  desc="View scheduled team events and training sessions"           enabled={config.tabs.events}  onChange={val => updateTabs({ events: val })} />
          <Toggle label="Races"   desc="View upcoming races and manage registrations"               enabled={config.tabs.races}   onChange={val => updateTabs({ races: val })} />
          <Toggle label="Swag"    desc="Browse swag items, express interest, and track orders"      enabled={config.tabs.swag}    onChange={val => updateTabs({ swag: val })} />
          <Toggle label="Expenses" desc="Submit and track personal triathlon expenses"              enabled={config.tabs.expenses} onChange={val => updateTabs({ expenses: val })} />
        </div>

        <div className="mt-5 lg:mt-0">
          <CalendarSettings />
        </div>
      </div>
    </div>
  )
}
