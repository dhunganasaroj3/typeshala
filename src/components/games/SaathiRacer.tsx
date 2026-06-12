import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../../types'
import type { CompletedRun } from '../typing/TypingCore'
import TypingCore from '../typing/TypingCore'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useSettings } from '../../store/useSettings'
import { useStats } from '../../store/useStats'
import { useProgress } from '../../store/useProgress'
import { runResultPipeline } from '../../game/celebrate'
import { personalAvgWpm } from '../../game/gamification'
import { EN_SENTENCES } from '../../data/words.en'
import { NE_SENTENCES, NE_PROVERBS } from '../../data/words.ne'

const GAME_ID = 'saathi-racer'

interface Passage {
  id: string
  roman: string
  dev?: string
}

function pickPassage(lang: Lang): Passage {
  if (lang === 'ne') {
    const pool = [...NE_SENTENCES, ...NE_PROVERBS]
    const w = pool[Math.floor(Math.random() * pool.length)]
    return { id: `ne:${w.roman}`, roman: w.roman, dev: w.dev }
  }
  const s = EN_SENTENCES[Math.floor(Math.random() * EN_SENTENCES.length)]
  return { id: `en:${s}`, roman: s }
}

/** Gaussian-ish noise via central limit (sum of uniforms). */
function gauss(): number {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2
}

interface Racer {
  /** 0..1 fraction of passage completed */
  progress: number
  finished: boolean
  finishTime: number | null
}

export default function SaathiRacer() {
  const lang = useSettings((s) => s.lang)
  const [phase, setPhase] = useState<'ready' | 'racing' | 'done'>('ready')
  const [passage, setPassage] = useState<Passage>(() => pickPassage(lang))
  const [tick, setTick] = useState(0) // forces lane re-render

  const totalChars = useMemo(() => passage.roman.length, [passage])

  // Lanes (mutated in the loop, mirrored to state via tick)
  const you = useRef<Racer>({ progress: 0, finished: false, finishTime: null })
  const rival = useRef<Racer>({ progress: 0, finished: false, finishTime: null })
  const ghost = useRef<Racer>({ progress: 0, finished: false, finishTime: null })

  // Rival model
  const rivalState = useRef({ wpm: 30, stumbleUntil: 0, nextStumbleAt: 0 })
  // Ghost replay timeline
  const ghostTimeline = useRef<Array<{ t: number; i: number }>>([])
  const ghostHas = useRef(false)
  // You: keystroke timeline captured for ghost saving
  const youTimeline = useRef<Array<{ t: number; i: number }>>([])
  const raceStart = useRef(0)
  const youCorrectRef = useRef(0)
  const resultDone = useRef(false)

  const reset = useCallback(() => {
    const p = pickPassage(lang)
    setPassage(p)
    you.current = { progress: 0, finished: false, finishTime: null }
    rival.current = { progress: 0, finished: false, finishTime: null }
    ghost.current = { progress: 0, finished: false, finishTime: null }
    const avg = personalAvgWpm(useStats.getState().results, lang) ?? 30
    rivalState.current = {
      wpm: avg * 1.05,
      stumbleUntil: 0,
      nextStumbleAt: 1500 + Math.random() * 4000,
    }
    const gt = useStats.getState().ghosts[p.id]
    ghostTimeline.current = gt ?? []
    ghostHas.current = !!gt && gt.length > 0
    youTimeline.current = []
    youCorrectRef.current = 0
    resultDone.current = false
    raceStart.current = performance.now()
    setTick((t) => t + 1)
  }, [lang])

  const start = useCallback(() => {
    reset()
    setPhase('racing')
  }, [reset])

  // progress for You comes from TypingCore via a custom callback bridge.
  // We capture correct-char count by wrapping a lightweight per-keystroke hook:
  // TypingCore reports only on complete, so we mirror progress using the input ref
  // through onComplete; for live progress we track via a polling approach on youCorrectRef
  // which is updated by the keystroke listener below.
  const handleYouProgress = useCallback(
    (correctChars: number) => {
      youCorrectRef.current = correctChars
      const now = performance.now() - raceStart.current
      const last = youTimeline.current[youTimeline.current.length - 1]
      if (!last || last.i !== correctChars) {
        youTimeline.current.push({ t: now, i: correctChars })
      }
    },
    [],
  )

  const finishYou = useCallback(
    (run: CompletedRun) => {
      if (resultDone.current) return
      resultDone.current = true
      you.current.progress = 1
      you.current.finished = true
      you.current.finishTime = performance.now() - raceStart.current

      // Did You beat the ghost? (you finished before ghost completed, or no ghost / ghost slower)
      const ghostFinishMs = ghostHas.current
        ? ghostTimeline.current[ghostTimeline.current.length - 1]?.t ?? Infinity
        : Infinity
      const beatGhost = ghostHas.current && (you.current.finishTime ?? Infinity) < ghostFinishMs

      // Save ghost if this is a personal best time for the passage
      const prev = useStats.getState().ghosts[passage.id]
      const prevTime = prev ? prev[prev.length - 1]?.t ?? Infinity : Infinity
      if ((you.current.finishTime ?? Infinity) < prevTime) {
        useStats.getState().saveGhost(passage.id, youTimeline.current)
      }

      // score: WPM-weighted with a beat-ghost bonus
      const score = Math.round(run.correctChars * (run.seconds > 0 ? 60 / run.seconds : 0) + (beatGhost ? 200 : 0))
      useProgress.getState().recordGameScore(GAME_ID, score)

      if (beatGhost) useProgress.getState().setGhostBeaten()

      runResultPipeline({ lang, mode: 'game', mode2: GAME_ID, run })
      setPhase('done')
      setTick((t) => t + 1)
    },
    [lang, passage.id],
  )

  // ---- race loop: drive rival + ghost ----
  useGameLoop((dt) => {
    if (phase !== 'racing') return
    const now = performance.now() - raceStart.current

    // rival
    const rs = rivalState.current
    if (!rival.current.finished) {
      if (now >= rs.nextStumbleAt && now >= rs.stumbleUntil) {
        rs.stumbleUntil = now + 400
        rs.nextStumbleAt = now + 2000 + Math.random() * 4000
      }
      const stumbling = now < rs.stumbleUntil
      const effWpm = stumbling ? rs.wpm * 0.15 : rs.wpm * (1 + gauss() * 0.12)
      const charsPerMs = (Math.max(2, effWpm) * 5) / 60 / 1000
      rival.current.progress = Math.min(1, rival.current.progress + (charsPerMs * dt * 1000) / totalChars)
      if (rival.current.progress >= 1) {
        rival.current.finished = true
        rival.current.finishTime = now
      }
    }

    // ghost replay (interpolate index over timeline)
    if (ghostHas.current && !ghost.current.finished) {
      const tl = ghostTimeline.current
      // find segment around `now`
      let idx = 0
      for (let k = 0; k < tl.length; k++) {
        if (tl[k].t <= now) idx = k
        else break
      }
      const a = tl[idx]
      const b = tl[idx + 1]
      let chars: number
      if (b) {
        const span = b.t - a.t || 1
        const f = Math.min(1, Math.max(0, (now - a.t) / span))
        chars = a.i + (b.i - a.i) * f
      } else {
        chars = a.i
      }
      ghost.current.progress = Math.min(1, chars / totalChars)
      const lastT = tl[tl.length - 1]?.t ?? 0
      if (now >= lastT) {
        ghost.current.progress = 1
        ghost.current.finished = true
        ghost.current.finishTime = lastT
      }
    }

    // mirror You progress from ref
    you.current.progress = Math.min(1, youCorrectRef.current / totalChars)

    setTick((t) => (t + 1) % 1_000_000)
  }, phase === 'racing')

  const lanes: Array<{ label: string; racer: Racer; cls: string; show: boolean }> = [
    { label: 'You', racer: you.current, cls: 'text-main', show: true },
    { label: 'Rival', racer: rival.current, cls: 'text-error', show: true },
    { label: 'Ghost', racer: ghost.current, cls: 'text-sub', show: ghostHas.current },
  ]

  return (
    <div className="flex flex-col gap-4" data-frame={tick}>
      <h3 className="font-devanagari text-xl text-main">
        साथी रेसर <span className="font-sans text-sm text-sub">Saathi Racer</span>
      </h3>

      {/* track */}
      <div className="flex flex-col gap-2 rounded-lg border border-surface bg-surface/40 p-3">
        {lanes
          .filter((l) => l.show)
          .map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className={`w-14 shrink-0 text-xs ${l.cls}`}>{l.label}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-bg">
                <div
                  className={`absolute top-1/2 -translate-y-1/2 text-lg transition-none ${l.cls}`}
                  style={{
                    left: `calc(${(l.racer.progress * 100).toFixed(2)}% - 12px)`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {l.label === 'Ghost' ? '👻' : l.label === 'Rival' ? '🤖' : '🏃'}
                </div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-surface">🏁</div>
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-sub">
                {Math.round(l.racer.progress * 100)}%
              </span>
            </div>
          ))}
      </div>

      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="max-w-md text-sub">
            Race a rival bot and your own ghost from a past run. Type the passage as fast and clean as you
            can. Beat the ghost to bank a big bonus.
          </p>
          <button
            className="rounded-md bg-main px-6 py-2 font-bold text-bg transition hover:opacity-90"
            onClick={start}
          >
            Start race
          </button>
        </div>
      )}

      {phase === 'racing' && (
        <div>
          <TypingCore
            key={passage.id}
            text={passage.roman}
            lang={lang}
            devText={passage.dev}
            autoFocus
            onComplete={finishYou}
          />
          <ProgressBridge text={passage.roman} onProgress={handleYouProgress} />
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <h4 className="text-lg text-main">
            {ghostHas.current && (you.current.finishTime ?? Infinity) <
            (ghostTimeline.current[ghostTimeline.current.length - 1]?.t ?? Infinity)
              ? '👻 Ghost beaten!'
              : 'Race complete'}
          </h4>
          <p className="text-sub">
            You finished {you.current.finishTime ? `in ${(you.current.finishTime / 1000).toFixed(1)}s` : ''}.
          </p>
          <button
            className="rounded-md bg-main px-6 py-2 font-bold text-bg transition hover:opacity-90"
            onClick={start}
          >
            Race again
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Lightweight keystroke watcher that mirrors the You-lane live progress without
 * modifying TypingCore. It listens on the document for printable keys and grades
 * against the passage roman sequence (Monkeytype-style: advance on every key,
 * report the count of leading-correct characters). This stays in sync with
 * TypingCore because both grade the same roman text against the same input.
 */
function ProgressBridge({ text, onProgress }: { text: string; onProgress: (correct: number) => void }) {
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  useEffect(() => {
    const typed: string[] = []
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Backspace') {
        typed.pop()
      } else if (e.key.length === 1) {
        if (typed.length < text.length) typed.push(e.key)
      } else {
        return
      }
      let correct = 0
      for (let i = 0; i < typed.length; i++) {
        if (typed[i] === text[i]) correct++
        else break
      }
      onProgressRef.current(correct)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [text])

  return null
}
