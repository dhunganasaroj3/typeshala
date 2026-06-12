import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../../types'
import type { KeyBatch } from '../../store/useStats'
import { useSettings } from '../../store/useSettings'
import { playThud, playTick } from '../../audio/sounds'
import WordsDisplay from './WordsDisplay'
import Caret from './Caret'
import DevanagariPreview from './DevanagariPreview'
import ComboCounter from './ComboCounter'

/** Everything a completed (or force-finished) typing run produces. */
export interface CompletedRun {
  seconds: number
  correctChars: number
  allTypedChars: number
  incorrect: number
  backspaces: number
  maxCombo: number
  perSecondRaw: number[]
  perSecondWpm: number[]
  perSecondErr: number[]
  keyBatch: KeyBatch
  finished: boolean
}

export interface TypingCoreProps {
  text: string
  lang: Lang
  /** Devanagari rendering of the whole target (unused for grading; kept for parity). */
  devText?: string
  onComplete: (result: CompletedRun) => void
  autoFocus?: boolean
  /**
   * Increment this to force the current run to finish immediately (e.g. time-mode
   * countdown hits 0). The run reports whatever has been typed so far with
   * `finished: false`. Changing `text` resets the run and ignores stale signals.
   */
  finishSignal?: number
}

const MIN_LATENCY = 40 // ms — discard sub-40ms (likely held / debounce)
const MAX_LATENCY = 12000 // ms — discard pauses over 12s as AFK
const IDLE_MS = 1200

/** Mutable per-run accumulators kept in a ref so keystrokes never re-render the world. */
interface RunState {
  started: boolean
  startTime: number
  lastKeyTime: number
  pos: number
  status: boolean[]
  correct: number
  typed: number
  incorrect: number
  backspaces: number
  combo: number
  maxCombo: number
  // per-second cumulative snapshots
  cumCorrectAtSec: number[]
  cumTypedAtSec: number[]
  cumErrAtSec: number[]
  lastCumCorrect: number
  lastCumTyped: number
  lastCumErr: number
  // per-key logging
  keyBatch: KeyBatch
  keyLatencies: Record<string, number[]>
  finished: boolean
}

function freshRun(): RunState {
  return {
    started: false,
    startTime: 0,
    lastKeyTime: 0,
    pos: 0,
    status: [],
    correct: 0,
    typed: 0,
    incorrect: 0,
    backspaces: 0,
    combo: 0,
    maxCombo: 0,
    cumCorrectAtSec: [],
    cumTypedAtSec: [],
    cumErrAtSec: [],
    lastCumCorrect: 0,
    lastCumTyped: 0,
    lastCumErr: 0,
    keyBatch: {},
    keyLatencies: {},
    finished: false,
  }
}

function TypingCore({ text, lang, onComplete, autoFocus = true, finishSignal = 0 }: TypingCoreProps) {
  const chars = useRef<string[]>(Array.from(text))
  const run = useRef<RunState>(freshRun())
  const soundOn = useSettings((s) => s.soundOn)
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  const inputRef = useRef<HTMLInputElement | null>(null)
  const wordsContainerRef = useRef<HTMLDivElement | null>(null)
  const activeCharRef = useRef<HTMLSpanElement | null>(null)

  // Display state — bumped only on key events (not per frame).
  const [pos, setPos] = useState(0)
  const [status, setStatus] = useState<boolean[]>([])
  const [combo, setCombo] = useState(0)
  const [romanTyped, setRomanTyped] = useState('')
  const [idle, setIdle] = useState(true)
  const idleTimer = useRef<number | null>(null)

  // Reset when the target text changes.
  useEffect(() => {
    chars.current = Array.from(text)
    run.current = freshRun()
    setPos(0)
    setStatus([])
    setCombo(0)
    setRomanTyped('')
    setIdle(true)
  }, [text])

  // Focus the hidden input on mount.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const finish = useCallback(
    (finished: boolean) => {
      const r = run.current
      if (r.finished) return
      r.finished = true
      const seconds = r.started ? (performance.now() - r.startTime) / 1000 : 0

      // Build keyBatch latency averages.
      const keyBatch: KeyBatch = {}
      for (const ch of Object.keys(r.keyBatch)) {
        const lat = r.keyLatencies[ch] ?? []
        const avg = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null
        keyBatch[ch] = { hits: r.keyBatch[ch].hits, misses: r.keyBatch[ch].misses, avgLatency: avg }
      }

      onComplete({
        seconds,
        correctChars: r.correct,
        allTypedChars: r.typed,
        incorrect: r.incorrect,
        backspaces: r.backspaces,
        maxCombo: r.maxCombo,
        perSecondRaw: [...r.cumTypedAtSec],
        perSecondWpm: [...r.cumCorrectAtSec],
        perSecondErr: [...r.cumErrAtSec],
        keyBatch,
        finished,
      })
    },
    [onComplete],
  )

  // Force-finish when the parent bumps finishSignal (e.g. time ran out).
  const lastSignal = useRef(finishSignal)
  useEffect(() => {
    if (finishSignal !== lastSignal.current) {
      lastSignal.current = finishSignal
      finish(false)
    }
  }, [finishSignal, finish])

  // Per-second sampler: snapshots cumulative correct/typed/err into rate buckets.
  useEffect(() => {
    const id = window.setInterval(() => {
      const r = run.current
      if (!r.started || r.finished) return
      const correctThisSec = r.correct - r.lastCumCorrect
      const typedThisSec = r.typed - r.lastCumTyped
      const errThisSec = r.incorrect - r.lastCumErr
      r.lastCumCorrect = r.correct
      r.lastCumTyped = r.typed
      r.lastCumErr = r.incorrect
      // store WPM-equivalent rates (chars/sec * 60 / 5)
      r.cumCorrectAtSec.push((correctThisSec * 60) / 5)
      r.cumTypedAtSec.push((typedThisSec * 60) / 5)
      r.cumErrAtSec.push(errThisSec)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const markActivity = useCallback(() => {
    setIdle(false)
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.repeat) return
      const r = run.current
      if (r.finished) return

      const now = performance.now()

      // Backspace: step back one position.
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (r.pos > 0) {
          r.pos -= 1
          r.backspaces += 1
          r.status[r.pos] = false
          r.combo = 0
          setPos(r.pos)
          setStatus([...r.status])
          setCombo(0)
          setRomanTyped(chars.current.slice(0, r.pos).join(''))
        }
        markActivity()
        return
      }

      // Only printable single characters are graded.
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()

      if (r.pos >= chars.current.length) return

      // Timer starts on first keystroke.
      if (!r.started) {
        r.started = true
        r.startTime = now
        r.lastKeyTime = now
      }

      const expected = chars.current[r.pos]
      const correct = e.key === expected
      const latency = now - r.lastKeyTime
      r.lastKeyTime = now

      // Per-key logging keyed on the EXPECTED char.
      const kb = r.keyBatch[expected] ?? { hits: 0, misses: 0, avgLatency: null }
      if (correct) kb.hits += 1
      else kb.misses += 1
      r.keyBatch[expected] = kb
      if (latency >= MIN_LATENCY && latency <= MAX_LATENCY) {
        ;(r.keyLatencies[expected] ??= []).push(latency)
      }

      r.typed += 1
      r.status[r.pos] = correct
      if (correct) {
        r.correct += 1
        r.combo += 1
        if (r.combo > r.maxCombo) r.maxCombo = r.combo
        if (soundRef.current) playTick()
      } else {
        r.incorrect += 1
        r.combo = 0
        if (soundRef.current) playThud()
      }

      r.pos += 1
      setPos(r.pos)
      setStatus([...r.status])
      setCombo(r.combo)
      setRomanTyped(chars.current.slice(0, r.pos).join(''))
      markActivity()

      if (r.pos >= chars.current.length) {
        // small async so the final char paints before results swap in
        finish(true)
      }
    },
    [finish, markActivity],
  )

  return (
    <div
      className="relative mx-auto w-full max-w-3xl outline-none"
      onClick={() => inputRef.current?.focus()}
    >
      {/* hidden capture input */}
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="typing input"
        className="absolute -z-10 h-px w-px opacity-0"
        onKeyDown={onKeyDown}
        onChange={() => {
          /* controlled-free: all input handled in onKeyDown */
        }}
        value=""
      />

      {lang === 'ne' && <DevanagariPreview romanTyped={romanTyped} />}

      <div ref={wordsContainerRef} className="relative">
        <WordsDisplay text={text} pos={pos} status={status} activeRef={activeCharRef} />
        <Caret
          targetRef={activeCharRef}
          containerRef={wordsContainerRef}
          pos={pos}
          idle={idle}
        />
      </div>

      <div className="mt-4 flex h-10 items-center justify-center">
        <ComboCounter combo={combo} />
      </div>
    </div>
  )
}

export default TypingCore
