import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../../types'
import type { KeyBatch } from '../../store/useStats'
import type { CompletedRun } from '../typing/TypingCore'
import { useSettings } from '../../store/useSettings'
import { playThud, playTick } from '../../audio/sounds'
import { tokenize } from '../../adaptive/generator/tokenize'
import { SAMPLE_MAX_MS, SAMPLE_MIN_MS } from '../../adaptive/constants'
import AdaptiveTypingLine from './AdaptiveTypingLine'

/**
 * A completed adaptive run. Extends the engine's CompletedRun so it can be
 * fed straight into runResultPipeline, and adds the per-TOKEN timing tables
 * the adaptive engine needs (`buildHistogram(hitsMisses, latenciesByToken)`).
 */
export interface AdaptiveRun extends CompletedRun {
  /** Per-token hit/miss counts (token == latin char for EN). */
  hitsMisses: Record<string, { hits: number; misses: number }>
  /** Per-token correct-hit latencies (ms, clamped to sample bounds). */
  latenciesByToken: Record<string, number[]>
  /** How many roman chars were graded. */
  pos: number
}

export interface AdaptiveInputProps {
  roman: string
  dev?: string
  lang: Lang
  onProgress?: (pos: number, errors: number) => void
  onComplete: (run: AdaptiveRun) => void
  autoFocus?: boolean
}

const IDLE_MS = 1200

/**
 * Build, for a roman string, a per-global-char-index map to the TOKEN that the
 * char belongs to. Spaces (and any char not consumed by tokenize) map to null,
 * meaning "advance only, do not grade as a token".
 *
 * For EN, tokenize returns the lowercase a-z chars; for NE it returns
 * transliteration tokens like 'kh','aa'. We walk each word and align the
 * tokens back onto their source character spans so each graded latin char is
 * attributed to the right token.
 */
function buildCharTokenMap(roman: string, lang: Lang): (string | null)[] {
  const map: (string | null)[] = new Array(roman.length).fill(null)
  // Walk words separated by spaces, tracking the global offset.
  let g = 0
  const words = roman.split(' ')
  for (let w = 0; w < words.length; w++) {
    const word = words[w]
    if (word.length) {
      const tokens = tokenize(word, lang)
      // Greedily re-align tokens onto the word's characters. tokenize lowercases
      // and drops non-token chars (capitals fold to lowercase, punctuation drops),
      // so we scan the source string and consume a token whenever its (lowercased)
      // text matches the upcoming source slice.
      const lower = word.toLowerCase()
      let i = 0 // local index within word
      let ti = 0 // token index
      while (i < word.length) {
        if (ti < tokens.length) {
          const tok = tokens[ti]
          if (lower.startsWith(tok, i)) {
            // Attribute every source char of this token span to the token.
            for (let k = 0; k < tok.length; k++) {
              map[g + i + k] = tok
            }
            i += tok.length
            ti += 1
            continue
          }
        }
        // Char not part of the next token (e.g. punctuation, leftover) -> ungraded.
        map[g + i] = null
        i += 1
      }
    }
    g += word.length
    // account for the separating space (last word has none)
    if (w < words.length - 1) {
      map[g] = null // the space itself is ungraded
      g += 1
    }
  }
  return map
}

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
  // per-second cumulative deltas (WPM-equivalent rates), like TypingCore
  perSecondRaw: number[]
  perSecondWpm: number[]
  perSecondErr: number[]
  lastCumCorrect: number
  lastCumTyped: number
  lastCumErr: number
  // per latin char (global stats heatmap)
  keyBatch: KeyBatch
  keyLatencies: Record<string, number[]>
  // per TOKEN (adaptive engine)
  hitsMisses: Record<string, { hits: number; misses: number }>
  latenciesByToken: Record<string, number[]>
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
    perSecondRaw: [],
    perSecondWpm: [],
    perSecondErr: [],
    lastCumCorrect: 0,
    lastCumTyped: 0,
    lastCumErr: 0,
    keyBatch: {},
    keyLatencies: {},
    hitsMisses: {},
    latenciesByToken: {},
    finished: false,
  }
}

function clampLatency(ms: number): number {
  return Math.min(SAMPLE_MAX_MS, Math.max(SAMPLE_MIN_MS, ms))
}

function AdaptiveInput({
  roman,
  dev,
  lang,
  onProgress,
  onComplete,
  autoFocus = true,
}: AdaptiveInputProps) {
  const chars = useRef<string[]>(Array.from(roman))
  const charTokens = useRef<(string | null)[]>(buildCharTokenMap(roman, lang))
  const run = useRef<RunState>(freshRun())

  const soundOn = useSettings((s) => s.soundOn)
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  const inputRef = useRef<HTMLInputElement | null>(null)

  const [pos, setPos] = useState(0)
  const [status, setStatus] = useState<boolean[]>([])
  const [, setIdle] = useState(true)
  const idleTimer = useRef<number | null>(null)

  // Keep latest callbacks in refs so the keydown handler stays stable.
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  // Reset when the target roman (or language) changes.
  useEffect(() => {
    chars.current = Array.from(roman)
    charTokens.current = buildCharTokenMap(roman, lang)
    run.current = freshRun()
    setPos(0)
    setStatus([])
    setIdle(true)
  }, [roman, lang])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus, roman])

  const finish = useCallback(() => {
    const r = run.current
    if (r.finished) return
    r.finished = true
    const seconds = r.started ? (performance.now() - r.startTime) / 1000 : 0

    // Collapse keyLatencies into keyBatch avgLatency (global stats).
    const keyBatch: KeyBatch = {}
    for (const ch of Object.keys(r.keyBatch)) {
      const lat = r.keyLatencies[ch] ?? []
      const avg = lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null
      keyBatch[ch] = { hits: r.keyBatch[ch].hits, misses: r.keyBatch[ch].misses, avgLatency: avg }
    }

    const result: AdaptiveRun = {
      seconds,
      correctChars: r.correct,
      allTypedChars: r.typed,
      incorrect: r.incorrect,
      backspaces: r.backspaces,
      maxCombo: r.maxCombo,
      perSecondRaw: [...r.perSecondRaw],
      perSecondWpm: [...r.perSecondWpm],
      perSecondErr: [...r.perSecondErr],
      keyBatch,
      finished: true,
      hitsMisses: r.hitsMisses,
      latenciesByToken: r.latenciesByToken,
      pos: r.pos,
    }
    onCompleteRef.current(result)
  }, [])

  // Per-second sampler — snapshots cumulative deltas into rate buckets.
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
      r.perSecondWpm.push((correctThisSec * 60) / 5)
      r.perSecondRaw.push((typedThisSec * 60) / 5)
      r.perSecondErr.push(errThisSec)
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

      // Backspace steps back one position and clears that char's status.
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (r.pos > 0) {
          r.pos -= 1
          r.backspaces += 1
          r.status[r.pos] = false
          r.combo = 0
          setPos(r.pos)
          setStatus([...r.status])
          onProgressRef.current?.(r.pos, r.incorrect)
        }
        markActivity()
        return
      }

      // Only printable single characters are graded.
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()

      if (r.pos >= chars.current.length) return

      // Timer starts on the first keystroke.
      if (!r.started) {
        r.started = true
        r.startTime = now
        r.lastKeyTime = now
      }

      const expected = chars.current[r.pos]
      const correct = e.key === expected
      const latency = now - r.lastKeyTime
      r.lastKeyTime = now

      // --- Global stats: keyBatch keyed on the latin (lowercased) char. ---
      const latinKey = expected.toLowerCase()
      if (latinKey >= 'a' && latinKey <= 'z') {
        const kb = r.keyBatch[latinKey] ?? { hits: 0, misses: 0, avgLatency: null }
        if (correct) kb.hits += 1
        else kb.misses += 1
        r.keyBatch[latinKey] = kb
        if (correct && latency >= SAMPLE_MIN_MS && latency <= SAMPLE_MAX_MS) {
          ;(r.keyLatencies[latinKey] ??= []).push(latency)
        }
      }

      // --- Adaptive engine: attribute to the TOKEN this char belongs to. ---
      const token = charTokens.current[r.pos]
      if (token != null) {
        const tm = r.hitsMisses[token] ?? { hits: 0, misses: 0 }
        if (correct) tm.hits += 1
        else tm.misses += 1
        r.hitsMisses[token] = tm
        if (correct) {
          ;(r.latenciesByToken[token] ??= []).push(clampLatency(latency))
        }
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
      onProgressRef.current?.(r.pos, r.incorrect)
      markActivity()

      if (r.pos >= chars.current.length) {
        finish()
      }
    },
    [finish, markActivity],
  )

  return (
    <div
      className="relative mx-auto w-full max-w-4xl outline-none"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="adaptive typing input"
        className="absolute -z-10 h-px w-px opacity-0"
        onKeyDown={onKeyDown}
        onChange={() => {
          /* all input handled in onKeyDown */
        }}
        value=""
      />

      <AdaptiveTypingLine roman={roman} dev={dev} pos={pos} status={status} lang={lang} />
    </div>
  )
}

export default AdaptiveInput
