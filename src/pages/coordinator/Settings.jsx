import { useAppConfig } from '../../contexts/AppConfigContext'
import { Settings as SettingsIcon } from 'lucide-react'

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

export default function Settings() {
  const { config, updateTabs } = useAppConfig()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-asha-dark">Settings</h1>
        <p className="font-body text-asha-muted text-sm mt-1">Control what athletes can see in the app</p>
      </div>

      <div className="bg-white rounded-2xl border border-asha-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon size={16} className="text-asha-orange" />
          <h2 className="font-display font-semibold text-asha-dark">Athlete Tabs</h2>
        </div>
        <p className="font-body text-xs text-asha-muted mb-4">Toggle which sections are visible to athletes. Changes take effect immediately.</p>

        <Toggle
          label="Home"
          desc="Athlete home dashboard"
          enabled={config.tabs.home}
          onChange={(val) => updateTabs({ home: val })}
        />
        <Toggle
          label="Races"
          desc="View upcoming races and manage registrations"
          enabled={config.tabs.races}
          onChange={(val) => updateTabs({ races: val })}
        />
        <Toggle
          label="Swag"
          desc="Browse swag items, express interest, and track orders"
          enabled={config.tabs.swag}
          onChange={(val) => updateTabs({ swag: val })}
        />
        <Toggle
          label="Expenses"
          desc="Submit and track personal triathlon expenses"
          enabled={config.tabs.expenses}
          onChange={(val) => updateTabs({ expenses: val })}
        />
      </div>
    </div>
  )
}
