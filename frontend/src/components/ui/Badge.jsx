const tones = {
  neutral: 'bg-surface text-ink border border-border',
  secondary:
    'bg-secondary-50 dark:bg-[#0D1F1D] text-secondary-700 dark:text-secondary-300 border border-secondary-400/35',
  ai: 'bg-purple-50 dark:bg-[#190D2C] text-purple-700 dark:text-purple-300 border border-purple-400/35',
  info: 'bg-sky-50 dark:bg-[#0B1D2C] text-sky-700 dark:text-sky-300 border border-sky-400/35',
  success: 'bg-success-bg text-success border border-success/30',
  warning: 'bg-warning-bg text-warning border border-warning/30',
  danger: 'bg-danger-bg text-danger border border-danger/30',
}

export default function Badge({ children, tone = 'neutral', icon: Icon, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
        tones[tone] || tones.neutral,
        className,
      ].join(' ')}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
      {children}
    </span>
  )
}
