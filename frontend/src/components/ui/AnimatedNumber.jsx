import { useEffect, useState } from 'react'

export default function AnimatedNumber({
  value = 0,
  duration = 550,
  prefix = '',
  suffix = '',
  locale = 'en-IN',
  decimals = 0,
  className = '',
}) {
  const numericTarget = Number(value) || 0
  const [displayValue, setDisplayValue] = useState(numericTarget)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || duration <= 0) {
      setDisplayValue(numericTarget)
      return
    }

    let startTimestamp = null
    const startVal = displayValue
    const delta = numericTarget - startVal

    if (Math.abs(delta) < 0.01) {
      setDisplayValue(numericTarget)
      return
    }

    let rafId = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const elapsed = timestamp - startTimestamp
      const progress = Math.min(1, elapsed / duration)
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startVal + delta * eased
      setDisplayValue(current)

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step)
      } else {
        setDisplayValue(numericTarget)
      }
    }

    rafId = window.requestAnimationFrame(step)
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericTarget, duration])

  const formatted =
    decimals > 0
      ? Number(displayValue).toFixed(decimals)
      : Math.round(displayValue).toLocaleString(locale)

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
