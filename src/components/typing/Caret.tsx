import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

export interface CaretProps {
  /** Ref of the character span the caret should track. */
  targetRef: React.RefObject<HTMLSpanElement | null>
  /** Ref of the positioned container the caret lives in (for offset math). */
  containerRef: React.RefObject<HTMLElement | null>
  /** Re-position trigger — bump whenever the caret should move (e.g. typed pos). */
  pos: number
  /** Whether the user is currently idle (drives the blink). */
  idle: boolean
}

/**
 * Absolutely-positioned blinking caret that smoothly slides to the active
 * character. Position is updated imperatively via a ref + rAF so it never
 * triggers React re-renders; the slide easing is ~90ms.
 */
function Caret({ targetRef, containerRef, pos, idle }: CaretProps) {
  const caretRef = useRef<HTMLDivElement | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const caret = caretRef.current
    const target = targetRef.current
    const container = containerRef.current
    if (!caret || !target || !container) return

    const cRect = container.getBoundingClientRect()
    const tRect = target.getBoundingClientRect()
    const x = tRect.left - cRect.left
    const y = tRect.top - cRect.top
    const h = tRect.height || 32

    let frame = requestAnimationFrame(() => {
      caret.style.height = `${h}px`
      caret.style.transition = reduced ? 'none' : 'transform 90ms ease-out'
      caret.style.transform = `translate(${x}px, ${y}px)`
    })
    return () => cancelAnimationFrame(frame)
  }, [pos, targetRef, containerRef, reduced])

  return (
    <div
      ref={caretRef}
      aria-hidden
      className={`pointer-events-none absolute top-0 left-0 w-0.5 rounded-full bg-main ${
        idle && !reduced ? 'animate-pulse' : ''
      }`}
      style={{ transform: 'translate(0,0)', height: '32px' }}
    />
  )
}

export default Caret
