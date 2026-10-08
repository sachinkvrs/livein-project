/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-bg-rgb) / <alpha-value>)',
          50: 'rgb(var(--primary-50-rgb) / <alpha-value>)',
          100: '#CBD9E4',
          400: '#1E3A5F',
          600: '#0B2138',
          700: '#081A2C',
          900: '#06172A',
        },
        secondary: {
          DEFAULT: '#06B6A4',
          50: 'rgb(var(--secondary-50-rgb) / <alpha-value>)',
          100: '#C0F5EE',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#1CC9B7',
          500: '#06B6A4',
          600: 'rgb(var(--secondary-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--secondary-700-rgb) / <alpha-value>)',
        },
        ai: {
          DEFAULT: 'rgb(var(--ai-accent-rgb) / <alpha-value>)',
          bg: 'rgb(var(--ai-bg-rgb) / <alpha-value>)',
          border: 'rgb(var(--ai-border-rgb) / <alpha-value>)',
        },
        page: 'rgb(var(--bg-page-rgb) / <alpha-value>)',
        card: 'rgb(var(--bg-card-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
          muted: 'rgb(var(--bg-surface-muted-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--text-ink-rgb) / <alpha-value>)',
          muted: 'rgb(var(--text-ink-muted-rgb) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)',
          bg: 'rgb(var(--success-bg-rgb) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)',
          bg: 'rgb(var(--warning-bg-rgb) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)',
          bg: 'rgb(var(--danger-bg-rgb) / <alpha-value>)',
        },
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: 'var(--shadow-soft, 0 1px 2px rgba(6, 23, 42, 0.04), 0 4px 16px rgba(6, 23, 42, 0.06))',
        card: 'var(--shadow-card, 0 1px 3px rgba(6, 23, 42, 0.06), 0 8px 24px rgba(6, 23, 42, 0.05))',
        glow: '0 0 24px rgba(6, 182, 164, 0.22)',
        'ai-glow': '0 0 28px rgba(168, 85, 247, 0.25)',
      },
    },
  },
  plugins: [],
}
