import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lang, TestResult } from '../types'
import { useSettings } from '../store/useSettings'
import { useUI } from '../store/useUI'
import TestConfigBar, { type TestConfig } from './typing/TestConfigBar'
import TypingCore, { type CompletedRun } from './typing/TypingCore'
import ResultsCard from './typing/ResultsCard'
import { runResultPipeline } from '../game/celebrate'
import { EN_WORDS } from '../data/words.en'
import { NE_TIER1, NE_TIER2, NE_TIER3, NE_TIER4, NE_TIER5 } from '../data/words.ne'

const NE_POOL = [...NE_TIER1, ...NE_TIER2, ...NE_TIER3, ...NE_TIER4, ...NE_TIER5]

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Build a drill: returns the graded roman text and (for ne) the devanagari display text. */
function buildDrill(lang: Lang, count: number): { text: string; dev?: string } {
  if (lang === 'en') {
    const pool = shuffle(EN_WORDS)
    const picked: string[] = []
    while (picked.length < count) {
      picked.push(...pool)
    }
    return { text: picked.slice(0, count).join(' ') }
  }
  const pool = shuffle(NE_POOL)
  const picked: typeof NE_POOL = []
  while (picked.length < count) {
    picked.push(...pool)
  }
  const chosen = picked.slice(0, count)
  return {
    text: chosen.map((w) => w.roman).join(' '),
    dev: chosen.map((w) => w.dev).join(' '),
  }
}

export default function TestView() {
  const lang = useSettings((s) => s.lang)
  const setTypingFocus = useUI((s) => s.setTypingFocus)

  const [config, setConfig] = useState<TestConfig>({ mode: 'time', amount: 30 })
  const [runId, setRunId] = useState(0) // bump to remount TypingCore (restart)
  const [result, setResult] = useState<TestResult | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [finishSignal, setFinishSignal] = useState(0) // bump to force-finish the run (time up)

  // word count: time mode generates ~6 words/sec; words mode is exact.
  const wordCount = config.mode === 'time' ? Math.max(20, config.amount * 6) : config.amount

  const drill = useMemo(
    () => buildDrill(lang, wordCount),
    // regenerate on each restart and config/lang change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, wordCount, runId],
  )

  const restart = useCallback(() => {
    setResult(null)
    setRunId((n) => n + 1)
  }, [])

  // typing focus on/off while a drill is active (no result, not editing config)
  useEffect(() => {
    setTypingFocus(!result)
    return () => setTypingFocus(false)
  }, [result, runId, setTypingFocus])

  // time-mode countdown (informational + force-finish)
  const expiredRef = useRef(false)
  useEffect(() => {
    expiredRef.current = false
    if (config.mode !== 'time' || result) {
      setRemaining(null)
      return
    }
    setRemaining(config.amount)
    const started = performance.now()
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000
      const left = Math.max(0, config.amount - elapsed)
      setRemaining(left)
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        window.clearInterval(id)
        // time's up: force TypingCore to report whatever was typed -> results screen
        setFinishSignal((n) => n + 1)
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [config.mode, config.amount, runId, result])

  const handleComplete = useCallback(
    (run: CompletedRun) => {
      // accept both natural completion (finished) and time-up force-finish.
      // ignore an empty force-finish (user never typed anything).
      if (!run.finished && run.allTypedChars === 0) {
        restart()
        return
      }
      const mode2 = String(config.amount)
      const cp = lang === 'ne' && drill.dev ? drill.dev.replace(/\s+/g, '').length : undefined
      const r = runResultPipeline({
        lang,
        mode: config.mode,
        mode2,
        run,
        cpmCorrectCodePoints: cp,
      })
      setResult(r)
    },
    [config.amount, config.mode, lang, drill.dev, restart],
  )

  // global Tab=restart / Esc=reset shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        restart()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        restart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [restart])

  if (result) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6">
        <ResultsCard result={result} onRestart={restart} onNext={restart} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      <TestConfigBar config={config} onChange={setConfig} dimmed={false} />

      {config.mode === 'time' && remaining != null && (
        <div className="text-center text-2xl text-main tabular-nums font-semibold">
          {Math.ceil(remaining)}
        </div>
      )}

      <TypingCore
        key={`${lang}-${config.mode}-${config.amount}-${runId}`}
        text={drill.text}
        devText={drill.dev}
        lang={lang}
        autoFocus
        finishSignal={finishSignal}
        onComplete={handleComplete}
      />
    </div>
  )
}
