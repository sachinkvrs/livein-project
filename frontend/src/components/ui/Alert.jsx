import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'

const config = {
  info: { icon: Info, wrap: 'bg-primary-50 border-border text-ink' },
  success: { icon: CheckCircle2, wrap: 'bg-success-bg border-success/30 text-success' },
  warning: { icon: AlertTriangle, wrap: 'bg-warning-bg border-warning/30 text-warning' },
  danger: { icon: XCircle, wrap: 'bg-danger-bg border-danger/30 text-danger' },
}

export default function Alert({ level = 'info', title, children, onClose, className = '' }) {
  const { icon: Icon, wrap } = config[level] || config.info
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border p-4 ${wrap} ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className="mt-0.5 text-sm opacity-90">{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="flex-shrink-0 rounded-md p-0.5 hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
