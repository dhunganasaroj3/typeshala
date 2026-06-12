import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '../../store/useSettings'
import { useAdaptive } from '../../store/useAdaptive'
import { cpmToWpm, wpmToCpm } from '../../adaptive/constants'
import { buildHistogram } from '../../adaptive/histogram'
import { runResultPipeline } from '../../game/celebrate'
import AdaptiveStatBar from './AdaptiveStatBar'
import AdaptiveTypingLine from './AdaptiveTypingLine'
import { useAdaptiveLesson } from './useAdaptiveLesson'
import AdaptiveInput, { type AdaptiveRun } from './AdaptiveInput'
import LetterGrid from './LetterGrid'
import OnScreenKeyboard from './OnScreenKeyboard'
import ProfileView from './ProfileView'

/**
 * AdaptiveView — the Keybr-style page shell + continuous lesson loop.
 *
 * Owns the lesson lifecycle: it pulls the current plan/text from
 * useAdaptiveLesson(), renders the stat bar + typing line (driven by
 * AdaptiveInput's keystroke capture), and on completion feeds the run through
 * the histogram -> recordLesson -> result pipeline, then regenerates the next
 * lesson. Live stats update during typing via onProgress.
 */
export default function AdaptiveView() {
  const lang = useSettings((s) => s.lang)
  const settings = useAdaptive((s) => s.settings)
  const byLang = useAdaptive((s) => s.byLang)
  const recordLesson = useAdaptive((s) => s.recordLesson)

  const { plan, roman, dev, keyConfidences, regenerate } = useAdaptiveLesson()

  const [showProfile, setShowProfile] = useState(false)

  // Restart key — bumping it forces AdaptiveInput to remount (fresh run) on Tab.
  const [restartKey, setRestartKey] = useState(0)

  // Live stats during a run.
  const [pos, setPos] = useState(0)
  const [liveErrors, setLiveErrors] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)

  // Brief results flash after a lesson completes.
  const [flash, setFlash] = useState<{ wpm: number; acc: number } | null>(null)

  const lessonCount = byLang[lang]?.lessonCount ?? 0

  // The next key the learner is expected to press (drives keyboard highlight).
  const nextExpectedKey: string | null = roman.length > pos ? roman[pos] : null

  const stopTimer = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const resetLive = useCallback(() => {
    setPos(0)
    setLiveErrors(0)
    setElapsed(0)
    startRef.current = null
    stopTimer()
  }, [stopTimer])

  // Reset live state whenever the target text or restart counter changes.
  useEffect(() => {
    resetLive()
    return stopTimer
  }, [roman, restartKey, resetLive, stopTimer])

  const onProgress = useCallback(
    (p: number, errors: number) => {
      setPos(p)
      setLiveErrors(errors)
      // Start the elapsed-time ticker on the first keystroke.
      if (startRef.current == null && p > 0) {
        startRef.current = performance.now()
        setFlash(null)
        stopTimer()
        tickRef.current = window.setInterval(() => {
          if (startRef.current != null) {
            setElapsed((performance.now() - startRef.current) / 1000)
          }
        }, 100)
      }
    },
    [stopTimer],
  )

  const onComplete = useCallback(
    (run: AdaptiveRun) => {
      stopTimer()

      // 1) Fold per-token timings into the adaptive engine.
      const { timings, valid } = buildHistogram(run.hitsMisses, run.latenciesByToken)
      if (valid) recordLesson(lang, timings, Date.now())

      // 2) Run the shared result pipeline (XP, stats, achievements, confetti).
      //    For Nepali, CPM should count Devanagari code points of the output.
      const cpmCorrectCodePoints =
        lang === 'ne' && dev ? dev.replace(/\s+/g, '').length : undefined
      const result = runResultPipeline({
        lang,
        mode: 'lesson',
        mode2: `adaptive-${lang}`,
        run,
        cpmCorrectCodePoints,
      })

      // 3) Brief results flash, then regenerate the next lesson.
      setFlash({ wpm: Math.round(result.wpm), acc: Math.round(result.acc) })
      regenerate()
      setRestartKey((k) => k + 1)
    },
    [stopTimer, recordLesson, lang, dev, regenerate],
  )

  // Tab restarts the current lesson (Keybr behaviour).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        setFlash(null)
        setRestartKey((k) => k + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Derive live speed/accuracy from elapsed + progress.
  const correctSoFar = Math.max(0, pos - liveErrors)
  const liveWpm = elapsed > 0 ? (correctSoFar * 60) / elapsed / 5 : 0
  const liveCpm = wpmToCpm(liveWpm)
  const liveAcc = pos > 0 ? (100 * correctSoFar) / pos : 100

  // AdaptiveInput owns the authoritative per-char statuses and renders the typing
  // line itself; here we only need the live aggregate numbers above.

  if (showProfile) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-6">
        <Toolbar showProfile={showProfile} onToggleProfile={() => setShowProfile((v) => !v)} />
        <ProfileView lang={lang} />
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <AdaptiveStatBar
        wpm={liveWpm}
        cpm={liveCpm}
        accuracy={liveAcc}
        seconds={elapsed}
        focus={plan.focus}
        lessonCount={lessonCount}
        unit={settings.unit}
      />

      <div className="relative min-h-[10rem]">
        {flash && (
          <div className="pointer-events-none absolute -top-2 right-0 z-10 rounded-md bg-surface px-3 py-1 text-sm text-sub shadow">
            <span className="font-bold text-main">{flash.wpm}</span> wpm ·{' '}
            <span className="font-bold text-success">{flash.acc}%</span> · next lesson →
          </div>
        )}
        <AdaptiveInput
          key={restartKey}
          roman={roman}
          dev={dev}
          lang={lang}
          autoFocus
          onProgress={onProgress}
          onComplete={onComplete}
        />
        {/* Fallback render of the line for the first paint (input also renders it). */}
        {roman.length === 0 && (
          <AdaptiveTypingLine roman="" dev={dev} pos={0} status={[]} lang={lang} />
        )}
      </div>

      <LetterGrid keyConfidences={keyConfidences} />

      <OnScreenKeyboard
        keyConfidences={keyConfidences}
        nextKey={nextExpectedKey}
        showZones={settings.showZones}
        highlightNextKey={settings.highlightNextKey}
      />

      <Toolbar showProfile={showProfile} onToggleProfile={() => setShowProfile((v) => !v)} />

      <p className="text-center text-xs text-sub">
        Press <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono">Tab</kbd> to restart ·
        target {Math.round(cpmToWpm(settings.targetCpm))} wpm
      </p>
    </section>
  )
}

interface ToolbarProps {
  showProfile: boolean
  onToggleProfile: () => void
}

function Toolbar({ showProfile, onToggleProfile }: ToolbarProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onToggleProfile}
        className="rounded-md border border-surface bg-surface/50 px-4 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface"
      >
        {showProfile ? '← Back to practice' : 'Profile'}
      </button>
    </div>
  )
}
