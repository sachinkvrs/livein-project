import { useState } from 'react'
import {
  Bell,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Globe,
  Check,
  Sparkles,
  Car,
  Train,
  Bike,
  Footprints,
  Compass,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Select from '../components/ui/Select'
import { useTheme } from '../context/ThemeContext'
import { useTrip } from '../context/TripContext'

const DEFAULT_SETTINGS = {
  weatherAlerts: true,
  safetyAlerts: true,
  transportAlerts: true,
  budgetAlerts: true,
  shareData: true,
  language: 'English',
  currency: 'INR (₹)',
}

function ToggleSwitch({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <div
      onClick={() => {
        if (!disabled && onChange) onChange(!checked)
      }}
      className={`flex items-center justify-between gap-4 py-3.5 cursor-pointer select-none group transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex-1 pr-2">
        <p className="text-sm font-semibold text-ink group-hover:text-secondary-500 transition-colors">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled && onChange) onChange(!checked)
        }}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 ${
          checked ? 'bg-secondary-500' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const { theme, isDark, setTheme } = useTheme()
  const { bufferMode, setBufferMode, transportMode, setTransportMode } = useTrip()
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('tripnova_user_settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('[TripNova] Failed to read settings:', e)
    }
    return DEFAULT_SETTINGS
  })

  const [savedToast, setSavedToast] = useState(false)

  const showSaveFeedback = () => {
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
    }, 2000)
  }

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value }
      try {
        localStorage.setItem('tripnova_user_settings', JSON.stringify(updated))
      } catch (e) {
        console.warn('[TripNova] Failed to persist settings:', e)
      }
      return updated
    })
    showSaveFeedback()
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    showSaveFeedback()
  }

  const transportOptions = [
    { id: 'cab', label: 'Cab / Auto', icon: Car },
    { id: 'transit', label: 'Public Transit', icon: Train },
    { id: 'bike', label: 'Two-Wheeler', icon: Bike },
    { id: 'walk', label: 'Walking', icon: Footprints },
  ]

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary-500/30 bg-secondary-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-secondary-500">
              <Sliders className="h-3.5 w-3.5" />
              System Preferences
            </div>
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              Settings
            </h1>
            <p className="text-sm text-ink-muted">
              Configure appearance, notifications, and travel transit defaults.
            </p>
          </div>

          {savedToast && (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500 border border-emerald-500/30 shadow-soft animate-in fade-in">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

        {/* 1. Appearance Section */}
        <Card className="mb-5 p-6">
          <CardHeader
            icon={Sun}
            title="Appearance"
            subtitle="Customize visual theme for day, night, or system preference."
          />

          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  theme === 'light'
                    ? 'border-secondary-500 bg-secondary-500/10 text-secondary-500 font-bold shadow-soft ring-2 ring-secondary-500/20'
                    : 'border-border bg-surface hover:border-secondary-400 text-ink'
                }`}
              >
                <Sun className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-bold">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  theme === 'dark'
                    ? 'border-secondary-500 bg-secondary-500/10 text-secondary-500 font-bold shadow-soft ring-2 ring-secondary-500/20'
                    : 'border-border bg-surface hover:border-secondary-400 text-ink'
                }`}
              >
                <Moon className="h-5 w-5 text-sky-400" />
                <span className="text-xs font-bold">Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  theme === 'system'
                    ? 'border-secondary-500 bg-secondary-500/10 text-secondary-500 font-bold shadow-soft ring-2 ring-secondary-500/20'
                    : 'border-border bg-surface hover:border-secondary-400 text-ink'
                }`}
              >
                <Laptop className="h-5 w-5 text-ink-muted" />
                <span className="text-xs font-bold">System</span>
              </button>
            </div>

            <div className="border-t border-border/70 pt-2">
              <ToggleSwitch
                id="dark-mode-toggle"
                label="Dark Mode Foundation"
                description="Switch between pure black (#000000) Dark Mode and clean daylight mode."
                checked={isDark}
                onChange={(val) => handleThemeChange(val ? 'dark' : 'light')}
              />
            </div>
          </div>
        </Card>

        {/* 2. Notifications Section */}
        <Card className="mb-5 p-6">
          <CardHeader
            icon={Bell}
            title="Notifications"
            subtitle="Choose which automated travel updates and safety alerts you receive."
          />
          <div className="divide-y divide-border/70">
            <ToggleSwitch
              id="weather-alerts-toggle"
              label="Weather Alerts"
              description="Get instant notifications about heavy rain, storm warnings, and indoor swap suggestions."
              checked={settings.weatherAlerts}
              onChange={(val) => updateSetting('weatherAlerts', val)}
            />

            <ToggleSwitch
              id="safety-alerts-toggle"
              label="Safety & Traffic Alerts"
              description="Road closures, localized disruptions, and crowd warnings."
              checked={settings.safetyAlerts}
              onChange={(val) => updateSetting('safetyAlerts', val)}
            />

            <ToggleSwitch
              id="transport-alerts-toggle"
              label="Transportation & Schedule Alerts"
              description="Transit delays, departure buffer warnings, and route replanning."
              checked={settings.transportAlerts}
              onChange={(val) => updateSetting('transportAlerts', val)}
            />

            <ToggleSwitch
              id="budget-alerts-toggle"
              label="Budget Alerts"
              description="Notify when trip spending reaches 85% of your allocated budget."
              checked={settings.budgetAlerts}
              onChange={(val) => updateSetting('budgetAlerts', val)}
            />
          </div>
        </Card>

        {/* 3. Travel Section */}
        <Card className="mb-5 p-6">
          <CardHeader
            icon={Compass}
            title="Travel & Transit Defaults"
            subtitle="Configure safety buffers and default local transport for departure time calculations."
          />

          <div className="space-y-5 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
                Travel Buffer Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'relaxed', label: 'Relaxed', desc: '+20m safety buffer' },
                  { id: 'normal', label: 'Normal', desc: '+10m standard buffer' },
                  { id: 'safe', label: 'Safe', desc: '+25m peak traffic buffer' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setBufferMode(m.id)
                      showSaveFeedback()
                    }}
                    className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                      bufferMode === m.id
                        ? 'border-secondary-500 bg-secondary-500/10 text-secondary-500 font-bold shadow-soft ring-2 ring-secondary-500/20'
                        : 'border-border bg-surface hover:border-secondary-400 text-ink'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{m.label}</span>
                    <span className="text-[11px] text-ink-muted mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/70 pt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
                Preferred Transport Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {transportOptions.map((t) => {
                  const Icon = t.icon
                  const active = transportMode === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTransportMode(t.id)
                        showSaveFeedback()
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? 'border-secondary-500 bg-secondary-500 text-white shadow-glow'
                          : 'border-border bg-surface text-ink hover:border-secondary-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t border-border/70 pt-4">
              <Select
                label="Default Currency"
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
                options={['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)', 'AED (د.إ)']}
              />
              <Select
                label="Language"
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                options={['English', 'Malayalam', 'Hindi', 'Tamil', 'Kannada', 'Telugu']}
              />
            </div>
          </div>
        </Card>

        {/* 4. AI Personalization */}
        <Card variant="ai" className="p-6">
          <CardHeader
            icon={Sparkles}
            title="Data & AI Recommendations"
            subtitle="Personalized recommendations and adaptive travel intelligence."
          />
          <div className="divide-y divide-border/70">
            <ToggleSwitch
              id="share-data-toggle"
              label="AI Travel Personalization"
              description="Allow TripNova AI to tailor place recommendations based on your completed stops and interests."
              checked={settings.shareData}
              onChange={(val) => updateSetting('shareData', val)}
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
