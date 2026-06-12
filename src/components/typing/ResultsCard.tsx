import { useEffect, useRef, useState } from 'react'
import type { TestResult } from '../../types'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import WpmChart from './WpmChart'

export interface ResultsCardProps {
  result: TestResult
  onRestart: () => void
  onNext?: () => void
}

const XP_DURATION = 800 // ms count-up

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sub text-xs uppercase tracking-wider">{label}</span>
      <span className="text-text text-2xl font-semibold tabular-nums">
        {value}
        {sub && <span className="text-sub ml-1 text-sm">{sub}</span>}
      </span>
    </div>
  )
}

function ResultsCard({ result, onRestart, onNext }: ResultsCardProps) {
  const reduced = usePrefersReducedMotion()
  const [xp, setXp] = useState(reduced ? result.xp : 0)
  const rafRef = useRef<number | null>(null)

  // Animated XP count-up 0 -> result.xp.
  useEffect(() => {
    if (reduced) {
      setXp(result.xp)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / XP_DURATION)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setXp(Math.round(result.xp * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [result.xp, reduced])

  // Tab = restart, Enter = next (if available).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        onRestart()
      } else if (e.key === 'Enter' && onNext) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRestart, onNext])

  const c = result.chars

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl bg-surface/40 p-6">
      <div className="flex items-end gap-8">
        <div className="flex flex-col">
          <span className="text-sub text-xs uppercase tracking-wider">wpm</span>
          <span className="text-main text-6xl font-bold tabular-nums leading-none">
            {Math.round(result.wpm)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sub text-xs uppercase tracking-wider">acc</span>
          <span className="text-main text-6xl font-bold tabular-nums leading-none">
            {Math.round(result.acc)}%
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {result.isPb && (
            <span className="rounded bg-xp/20 px-2 py-1 text-xp text-xs font-bold uppercase">
              New PB
            </span>
          )}
          <span className="text-xp text-2xl font-bold tabular-nums">+{xp} XP</span>
        </div>
      </div>

      <div className="mt-6">
        <WpmChart wpm={result.chart.wpm} raw={result.chart.raw} err={result.chart.err} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="raw" value={`${Math.round(result.raw)}`} />
        <Stat label="consistency" value={`${Math.round(result.consistency)}%`} />
        <Stat label="time" value={`${result.seconds.toFixed(1)}`} sub="s" />
        <Stat label="cpm" value={`${Math.round(result.cpm)}`} />
        <Stat
          label="characters"
          value={`${c.correct}/${c.incorrect}/${c.missed}/${c.extra}`}
        />
        <Stat label="max combo" value={`${result.maxCombo}`} />
        <Stat label="backspaces" value={`${c.backspaces}`} />
        <Stat label="mode" value={`${result.mode}`} sub={result.mode2} />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onRestart}
          className="rounded-lg bg-surface px-5 py-2 text-text transition-colors hover:bg-surface/70"
        >
          Restart <span className="text-sub ml-1 text-xs">Tab</span>
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="rounded-lg bg-main/20 px-5 py-2 text-main transition-colors hover:bg-main/30"
          >
            Next <span className="text-sub ml-1 text-xs">Enter</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default ResultsCard
