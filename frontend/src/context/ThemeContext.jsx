import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'system', // 'light' | 'dark' | 'system'
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('tripnova_theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved
      }
      const savedSettings = localStorage.getItem('tripnova_user_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed.darkMode === true) return 'dark'
        if (parsed.darkMode === false) return 'light'
      }
    } catch (e) {
      console.warn('[TripNova] Theme init error:', e)
    }
    return 'system'
  })

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('tripnova_theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      let activeIsDark = false
      if (theme === 'dark') {
        activeIsDark = true
      } else if (theme === 'light') {
        activeIsDark = false
      } else {
        activeIsDark = mediaQuery.matches
      }

      setIsDark(activeIsDark)
      if (activeIsDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()

    const listener = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [theme])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('tripnova_theme', newTheme)
      const savedSettings = localStorage.getItem('tripnova_user_settings')
      const currentSettings = savedSettings ? JSON.parse(savedSettings) : {}
      currentSettings.darkMode = newTheme === 'dark'
      currentSettings.theme = newTheme
      localStorage.setItem('tripnova_user_settings', JSON.stringify(currentSettings))
    } catch (e) {
      console.warn('[TripNova] Save theme error:', e)
    }
  }

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
