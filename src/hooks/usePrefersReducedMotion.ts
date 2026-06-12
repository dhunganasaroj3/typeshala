import { useEffect, useState } from 'react'
import { useSettings } from '../store/useSettings'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Returns true when motion should be reduced — honours both the OS-level
 * `prefers-reduced-motion: reduce` media query and the user's in-app override
 * (`useSettings().motionReduced`).
 */
export function usePrefersReducedMotion(): boolean {
  const userOverride = useSettings((s) => s.motionReduced)

  const [systemReduced, setSystemReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches)
    setSystemReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return systemReduced || userOverride
}

export default usePrefersReducedMotion
