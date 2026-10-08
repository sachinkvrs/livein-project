import { CheckCircle2, AlertTriangle, XCircle, Info, Sparkles } from 'lucide-react'

const config = {
  success: { icon: CheckCircle2, className: 'bg-success-bg text-success border border-success/25' },
  warning: { icon: AlertTriangle, className: 'bg-warning-bg text-warning border border-warning/25' },
  danger: { icon: XCircle, className: 'bg-danger-bg text-danger border border-danger/25' },
  info: { icon: Info, className: 'bg-sky-50 dark:bg-[#0B1D2C] text-sky-700 dark:text-sky-300 border border-sky-400/30' },
  ai: { icon: Sparkles, className: 'bg-purple-50 dark:bg-[#190D2C] text-purple-700 dark:text-purple-300 border border-purple-400/30' },
}

export default function StatusBadge({ level = 'success', children, className = '' }) {
  const { icon: Icon, className: toneClass } = config[level] || config.info
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
        toneClass,
        className,
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}
