import { Sparkles, AlertTriangle } from 'lucide-react'

const sizeMap = {
  sm: {
    outer: 'h-8 w-8',
    inner: 'h-6 w-6',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    outer: 'h-11 w-11',
    inner: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  lg: {
    outer: 'h-14 w-14',
    inner: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
}

/**
 * TripNova AI Orb identity component
 * state: 'idle' | 'thinking' | 'responding' | 'error'
 */
export default function AIOrb({ state = 'idle', size = 'md', className = '' }) {
  const s = sizeMap[size] || sizeMap.md
  const isThinking = state === 'thinking'
  const isError = state === 'error'

  return (
    <div
      className={`relative inline-flex items-center justify-center ${s.outer} ${className}`}
      aria-label={`TripNova AI status: ${state}`}
    >
      {/* Ambient outer halo */}
      <span
        className={`absolute inset-0 rounded-full transition-all duration-300 ${
          isError
            ? 'bg-danger/25'
            : isThinking
            ? 'bg-purple-500/30 animate-ping'
            : 'bg-secondary/20 animate-orb-breathe'
        }`}
        aria-hidden="true"
      />

      {/* Rotating ring when thinking */}
      <span
        className={`absolute inset-0.5 rounded-full border border-dashed transition-colors ${
          isError
            ? 'border-danger/60'
            : isThinking
            ? 'border-purple-400 animate-orb-spin'
            : 'border-secondary/40'
        }`}
        aria-hidden="true"
      />

      {/* Core Orb */}
      <span
        className={`relative flex items-center justify-center rounded-full shadow-soft transition-all ${s.inner} ${
          isError
            ? 'bg-danger text-white'
            : isThinking
            ? 'bg-gradient-to-tr from-purple-600 to-secondary text-white shadow-ai-glow'
            : 'bg-gradient-to-tr from-secondary-600 via-secondary to-purple-500 text-white shadow-glow'
        }`}
      >
        {isError ? (
          <AlertTriangle className={s.icon} aria-hidden="true" />
        ) : (
          <Sparkles
            className={`${s.icon} ${isThinking ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          />
        )}
      </span>
    </div>
  )
}
