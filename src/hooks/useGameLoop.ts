import { useEffect, useRef } from 'react'

/**
 * Runs `cb(dtSeconds, nowMs)` on every animation frame while `running` is true.
 * Uses requestAnimationFrame with delta-time between frames and cancels on
 * unmount or when `running` flips to false. The callback is kept in a ref so a
 * changing callback identity never restarts the loop.
 */
export function useGameLoop(cb: (dt: number, now: number) => void, running: boolean): void {
  const cbRef = useRef(cb)
  cbRef.current = cb

  useEffect(() => {
    if (!running) return

    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      cbRef.current(dt, now)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])
}

export default useGameLoop
