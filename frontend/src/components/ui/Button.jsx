import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-primary text-white hover:bg-primary-600 dark:bg-secondary dark:text-black dark:font-bold dark:hover:bg-secondary-300 shadow-xs focus-visible:ring-secondary-400',
  secondary:
    'bg-secondary text-white hover:bg-secondary-600 dark:text-black dark:font-bold dark:hover:bg-secondary-300 shadow-xs focus-visible:ring-secondary-400',
  ai: 'bg-purple-600 text-white hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 shadow-xs focus-visible:ring-purple-400',
  outline:
    'bg-card text-ink border border-border hover:border-secondary/60 hover:bg-surface focus-visible:ring-secondary-400',
  ghost:
    'bg-transparent text-ink hover:bg-surface focus-visible:ring-secondary-400',
  danger:
    'bg-danger text-white hover:bg-red-600 shadow-xs focus-visible:ring-danger',
}

const sizes = {
  sm: 'text-xs sm:text-sm px-3.5 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-6 py-3 gap-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'group inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon
          className="h-4 w-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
          aria-hidden="true"
        />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon
          className="h-4 w-4 flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </button>
  )
}
