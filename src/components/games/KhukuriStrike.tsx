import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../../types'
import type { CompletedRun } from '../typing/TypingCore'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useSettings } from '../../store/useSettings'
import { useStats } from '../../store/useStats'
import { useProgress } from '../../store/useProgress'
import { runResultPipeline } from '../../game/celebrate'
import { personalAvgWpm } from '../../game/gamification'
import { playTick, playThud, playWhoosh } from '../../audio/sounds'
import { EN_WORDS } from '../../data/words.en'
import { NE_TIER1, NE_TIER2, NE_TIER3 } from '../../data/words.ne'
import { graphemes } from '../../engine/graphemes'

const GAME_ID = 'khukuri-strike'
const START_LIVES = 3

interface WordSpec {
  roman: string // graded sequence
  dev?: string // shown for Nepali (DOM overlay)
  display: string // what the player sees / aligns letters against (roman for en, dev for ne)
}

interface Ship {
  id: number
  spec: WordSpec
  /** index of next roman char to type */
  typed: number
  x: number // 0..1 horizontal
  y: number // 0..1 vertical (0 top, 1 bottom)
  speed: number // units per second (fraction of screen height)
  alive: boolean
  exploding: number // remaining explosion time
}

interface Laser {
  x1: number
  y1: number
  x2: number
  y2: number
  life: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  hue: number
}

interface GameRefState {
  ships: Ship[]
  lasers: Laser[]
  particles: Particle[]
  lockedId: number | null
  nextId: number
  spawnTimer: number
  wave: number
  spawnedThisWave: number
  startMs: number
  // run accumulation
  correctChars: number
  allTyped: number
  incorrect: number
  maxCombo: number
  combo: number
  perSecondRaw: number[]
  perSecondWpm: number[]
  perSecondErr: number[]
  secCorrect: number
  secAll: number
  secErr: number
  lastSampleMs: number
  keyBatch: Record<string, { hits: number; misses: number; avgLatency: number | null; _sum: number; _n: number }>
  lastKeyMs: number
}

interface Hud {
  score: number
  lives: number
  wave: number
  combo: number
}

function buildWordPool(lang: Lang): WordSpec[] {
  if (lang === 'ne') {
    const all = [...NE_TIER1, ...NE_TIER2, ...NE_TIER3]
    return all.map((w) => ({ roman: w.roman, dev: w.dev, display: w.dev }))
  }
  return EN_WORDS.filter((w) => w.length >= 2 && w.length <= 9).map((w) => ({ roman: w, display: w }))
}

function comboMult(combo: number): number {
  if (combo >= 30) return 4
  if (combo >= 20) return 3
  if (combo >= 10) return 2
  return 1
}

export default function KhukuriStrike() {
  const lang = useSettings((s) => s.lang)
  const soundOn = useSettings((s) => s.soundOn)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pool = useMemo(() => buildWordPool(lang), [lang])

  const [hud, setHud] = useState<Hud>({ score: 0, lives: START_LIVES, wave: 1, combo: 0 })
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const scoreRef = useRef(0)
  const livesRef = useRef(START_LIVES)
  const phaseRef = useRef<'ready' | 'playing' | 'over'>('ready')
  phaseRef.current = phase

  // overlay positions for Nepali devanagari text (canvas can't shape conjuncts)
  const [overlays, setOverlays] = useState<
    Array<{ id: number; left: number; top: number; dev: string; typed: number; locked: boolean }>
  >([])

  const baseSpeed = useMemo(() => {
    const avg = personalAvgWpm(useStats.getState().results, lang)
    // map avg wpm to a starting fall speed fraction/sec; faster typists -> faster ships
    const seed = avg ? 0.02 + Math.min(0.04, (avg - 20) * 0.0008) : 0.022
    return Math.max(0.016, seed)
  }, [lang])

  const g = useRef<GameRefState>({
    ships: [],
    lasers: [],
    particles: [],
    lockedId: null,
    nextId: 1,
    spawnTimer: 0,
    wave: 1,
    spawnedThisWave: 0,
    startMs: 0,
    correctChars: 0,
    allTyped: 0,
    incorrect: 0,
    maxCombo: 0,
    combo: 0,
    perSecondRaw: [],
    perSecondWpm: [],
    perSecondErr: [],
    secCorrect: 0,
    secAll: 0,
    secErr: 0,
    lastSampleMs: 0,
    keyBatch: {},
    lastKeyMs: 0,
  })

  const reset = useCallback(() => {
    g.current = {
      ships: [],
      lasers: [],
      particles: [],
      lockedId: null,
      nextId: 1,
      spawnTimer: 0,
      wave: 1,
      spawnedThisWave: 0,
      startMs: performance.now(),
      correctChars: 0,
      allTyped: 0,
      incorrect: 0,
      maxCombo: 0,
      combo: 0,
      perSecondRaw: [],
      perSecondWpm: [],
      perSecondErr: [],
      secCorrect: 0,
      secAll: 0,
      secErr: 0,
      lastSampleMs: performance.now(),
      keyBatch: {},
      lastKeyMs: 0,
    }
    scoreRef.current = 0
    livesRef.current = START_LIVES
    setHud({ score: 0, lives: START_LIVES, wave: 1, combo: 0 })
  }, [])

  const finish = useCallback(() => {
    if (phaseRef.current === 'over') return
    const s = g.current
    const seconds = Math.max(1, (performance.now() - s.startMs) / 1000)
    const keyBatch: Record<string, { hits: number; misses: number; avgLatency: number | null }> = {}
    for (const [ch, b] of Object.entries(s.keyBatch)) {
      keyBatch[ch] = { hits: b.hits, misses: b.misses, avgLatency: b._n > 0 ? b._sum / b._n : null }
    }
    const run: CompletedRun = {
      seconds,
      correctChars: s.correctChars,
      allTypedChars: s.allTyped,
      incorrect: s.incorrect,
      backspaces: 0,
      maxCombo: s.maxCombo,
      perSecondRaw: s.perSecondRaw,
      perSecondWpm: s.perSecondWpm,
      perSecondErr: s.perSecondErr,
      keyBatch,
      finished: true,
    }
    useProgress.getState().recordGameScore(GAME_ID, scoreRef.current)
    runResultPipeline({ lang, mode: 'game', mode2: GAME_ID, run })
    setPhase('over')
  }, [lang])

  const start = useCallback(() => {
    reset()
    setPhase('playing')
  }, [reset])

  // sync overlay state for Nepali every render of loop via a low-frequency setState
  const pushOverlays = useCallback(() => {
    if (lang !== 'ne') {
      if (overlays.length) setOverlays([])
      return
    }
    const c = canvasRef.current
    if (!c) return
    const w = c.clientWidth
    const h = c.clientHeight
    setOverlays(
      g.current.ships
        .filter((sh) => sh.alive && sh.spec.dev)
        .map((sh) => ({
          id: sh.id,
          left: sh.x * w,
          top: sh.y * h,
          dev: sh.spec.dev!,
          typed: sh.typed,
          locked: g.current.lockedId === sh.id,
        })),
    )
  }, [lang, overlays.length])

  const spawnWord = useCallback(() => {
    const s = g.current
    const spec = pool[Math.floor(Math.random() * pool.length)]
    const ship: Ship = {
      id: s.nextId++,
      spec,
      typed: 0,
      x: 0.08 + Math.random() * 0.84,
      y: -0.05,
      speed: baseSpeed * (1 + (s.wave - 1) * 0.12) * (0.85 + Math.random() * 0.3),
      alive: true,
      exploding: 0,
    }
    s.ships.push(ship)
    s.spawnedThisWave++
  }, [pool, baseSpeed])

  const explode = useCallback((ship: Ship) => {
    const s = g.current
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 0.05 + Math.random() * 0.25
      s.particles.push({
        x: ship.x,
        y: ship.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.3,
        hue: 20 + Math.random() * 30,
      })
    }
    ship.exploding = 0.3
    ship.alive = false
  }, [])

  // ---- keystroke handling ----
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      if (e.key === 'Escape') {
        g.current.lockedId = null
        return
      }
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
      const ch = e.key
      e.preventDefault()
      const s = g.current
      const now = performance.now()

      // resolve target
      let target = s.lockedId != null ? s.ships.find((sh) => sh.id === s.lockedId && sh.alive) : undefined
      if (!target) {
        // find nearest (lowest, then leftmost) ship whose next char matches
        const candidates = s.ships
          .filter((sh) => sh.alive && sh.spec.roman[sh.typed] === ch)
          .sort((a, b) => b.y - a.y)
        target = candidates[0]
        if (target) s.lockedId = target.id
      }

      s.allTyped++
      s.secAll++

      const expected = target ? target.spec.roman[target.typed] : null
      if (target && expected === ch) {
        // correct
        s.correctChars++
        s.secCorrect++
        s.combo++
        if (s.combo > s.maxCombo) s.maxCombo = s.combo
        // per-key latency
        const kb = (s.keyBatch[ch] ??= { hits: 0, misses: 0, avgLatency: null, _sum: 0, _n: 0 })
        kb.hits++
        if (s.lastKeyMs > 0) {
          const dt = now - s.lastKeyMs
          if (dt >= 40 && dt <= 12000) {
            kb._sum += dt
            kb._n++
          }
        }
        s.lastKeyMs = now
        // laser from bottom center to ship
        s.lasers.push({ x1: target.x, y1: 1, x2: target.x, y2: target.y, life: 0.12 })
        if (soundOn) playTick()
        target.typed++
        if (target.typed >= target.spec.roman.length) {
          // word complete
          explode(target)
          s.lockedId = null
          const mult = comboMult(s.combo)
          const gained = target.spec.roman.length * 10 * mult
          scoreRef.current += gained
          if (soundOn) playWhoosh()
        }
      } else {
        // wrong key: reset combo, never lethal
        s.incorrect++
        s.secErr++
        s.combo = 0
        const kb = (s.keyBatch[ch] ??= { hits: 0, misses: 0, avgLatency: null, _sum: 0, _n: 0 })
        kb.misses++
        if (soundOn) playThud()
      }
    },
    [soundOn, explode],
  )

  useEffect(() => {
    if (phase !== 'playing') return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onKey])

  // ---- main loop ----
  const hudAccum = useRef(0)
  useGameLoop((dt) => {
    if (phaseRef.current !== 'playing') return
    const s = g.current
    const now = performance.now()

    // per-second sampling
    if (now - s.lastSampleMs >= 1000) {
      const elapsed = (now - s.lastSampleMs) / 1000
      s.perSecondRaw.push(((s.secAll / 5) * 60) / elapsed)
      s.perSecondWpm.push(((s.secCorrect / 5) * 60) / elapsed)
      s.perSecondErr.push(s.secErr)
      s.secAll = 0
      s.secCorrect = 0
      s.secErr = 0
      s.lastSampleMs = now
    }

    // spawn cadence scales with wave
    const spawnInterval = Math.max(0.6, 2.2 - (s.wave - 1) * 0.18)
    const waveSize = 6 + s.wave * 2
    s.spawnTimer += dt
    if (s.spawnTimer >= spawnInterval && s.spawnedThisWave < waveSize) {
      s.spawnTimer = 0
      spawnWord()
    }
    // advance wave when all spawned & cleared
    if (s.spawnedThisWave >= waveSize && s.ships.every((sh) => !sh.alive && sh.exploding <= 0)) {
      s.wave++
      s.spawnedThisWave = 0
      s.spawnTimer = 0
      setHud((h) => ({ ...h, wave: s.wave }))
    }

    // move ships
    for (const sh of s.ships) {
      if (sh.alive) {
        sh.y += sh.speed * dt
        if (sh.y >= 1) {
          // reached bottom: lose a life
          sh.alive = false
          if (s.lockedId === sh.id) s.lockedId = null
          livesRef.current--
          s.combo = 0
          if (livesRef.current <= 0) {
            // flush remaining ships then finish
            finish()
          }
        }
      } else if (sh.exploding > 0) {
        sh.exploding -= dt
      }
    }
    s.ships = s.ships.filter((sh) => sh.alive || sh.exploding > 0)

    // lasers
    for (const l of s.lasers) l.life -= dt
    s.lasers = s.lasers.filter((l) => l.life > 0)

    // particles
    for (const p of s.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    s.particles = s.particles.filter((p) => p.life > 0)

    draw()

    // HUD throttle (~6/s)
    hudAccum.current += dt
    if (hudAccum.current >= 0.16) {
      hudAccum.current = 0
      setHud({ score: scoreRef.current, lives: livesRef.current, wave: s.wave, combo: s.combo })
      pushOverlays()
    }
  }, phase === 'playing')

  // ---- render canvas ----
  const draw = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const W = c.width
    const H = c.height
    ctx.clearRect(0, 0, W, H)

    const s = g.current

    // starfield-ish background grid (subtle)
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97) % 100) / 100 * W
      const y = (((i * 53) % 100) / 100 * H + (performance.now() / 30) % H) % H
      ctx.fillRect(x, y, 1.5, 1.5)
    }

    // lasers
    for (const l of s.lasers) {
      ctx.strokeStyle = `rgba(120,220,255,${Math.min(1, l.life / 0.12)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(l.x1 * W, l.y1 * H)
      ctx.lineTo(l.x2 * W, l.y2 * H)
      ctx.stroke()
    }

    // ships + english words
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const sh of s.ships) {
      const px = sh.x * W
      const py = sh.y * H
      if (sh.alive) {
        const locked = s.lockedId === sh.id
        // body
        ctx.fillStyle = locked ? '#ffcf5c' : 'rgba(180,200,220,0.85)'
        ctx.beginPath()
        ctx.moveTo(px, py - 12)
        ctx.lineTo(px - 12, py + 8)
        ctx.lineTo(px + 12, py + 8)
        ctx.closePath()
        ctx.fill()
        // english word text (Nepali handled by DOM overlay)
        if (!sh.spec.dev) {
          ctx.font = '600 16px ui-monospace, monospace'
          const word = sh.spec.display
          const tx = px - ctx.measureText(word).width / 2
          // typed portion highlighted
          let cursor = tx
          for (let i = 0; i < word.length; i++) {
            ctx.fillStyle = i < sh.typed ? '#7fe08a' : locked && i === sh.typed ? '#ffcf5c' : '#cfd6dd'
            const cw = ctx.measureText(word[i]).width
            ctx.textAlign = 'left'
            ctx.fillText(word[i], cursor, py + 26)
            cursor += cw
          }
          ctx.textAlign = 'center'
        }
      } else if (sh.exploding > 0) {
        ctx.fillStyle = `rgba(255,160,60,${sh.exploding / 0.3})`
        ctx.beginPath()
        ctx.arc(px, py, 18 * (1 - sh.exploding / 0.3) + 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // particles
    for (const p of s.particles) {
      ctx.fillStyle = `hsla(${p.hue},90%,60%,${Math.max(0, p.life)})`
      ctx.fillRect(p.x * W - 1.5, p.y * H - 1.5, 3, 3)
    }

    // shooter at bottom
    ctx.fillStyle = '#8b5cf6'
    ctx.beginPath()
    ctx.moveTo(W / 2, H - 6)
    ctx.lineTo(W / 2 - 16, H - 1)
    ctx.lineTo(W / 2 + 16, H - 1)
    ctx.closePath()
    ctx.fill()
  }, [])

  // resize canvas to container
  useEffect(() => {
    const c = canvasRef.current
    const cont = containerRef.current
    if (!c || !cont) return
    const resize = () => {
      const r = cont.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.floor(r.width * dpr)
      c.height = Math.floor(r.height * dpr)
      const ctx = c.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <span className="text-sub">
            Score <span className="text-main font-bold tabular-nums">{hud.score}</span>
          </span>
          <span className="text-sub">
            Wave <span className="text-main tabular-nums">{hud.wave}</span>
          </span>
          <span className="text-sub">
            Combo <span className="text-xp tabular-nums">{hud.combo}x</span>
          </span>
        </div>
        <div className="text-streak">
          {'❤'.repeat(Math.max(0, hud.lives))}
          <span className="text-surface">{'❤'.repeat(Math.max(0, START_LIVES - hud.lives))}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-surface bg-bg"
        style={{ height: 'min(60vh, 460px)' }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Nepali devanagari overlays */}
        {lang === 'ne' &&
          phase === 'playing' &&
          overlays.map((o) => {
            const g2 = graphemes(o.dev)
            return (
              <div
                key={o.id}
                className="pointer-events-none absolute -translate-x-1/2 font-devanagari text-lg font-semibold"
                style={{ left: o.left, top: o.top + 22 }}
              >
                {g2.map((gr, i) => (
                  <span
                    key={i}
                    className={
                      i < o.typed ? 'text-success' : o.locked && i === o.typed ? 'text-xp' : 'text-text'
                    }
                  >
                    {gr}
                  </span>
                ))}
              </div>
            )
          })}

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg/80 text-center">
            {phase === 'ready' ? (
              <>
                <h3 className="font-devanagari text-2xl text-main">खुकुरी स्ट्राइक</h3>
                <p className="max-w-sm text-sub">
                  Type the falling words to blast them out of the sky. Wrong keys just break your combo —
                  you never die from a typo. Three lives, infinite waves.
                </p>
                <button
                  className="rounded-md bg-main px-6 py-2 font-bold text-bg transition hover:opacity-90"
                  onClick={start}
                >
                  Start
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl text-main">Game Over</h3>
                <p className="text-sub">
                  Final score <span className="text-xp font-bold tabular-nums">{hud.score}</span> · Wave{' '}
                  {hud.wave}
                </p>
                <button
                  className="rounded-md bg-main px-6 py-2 font-bold text-bg transition hover:opacity-90"
                  onClick={start}
                >
                  Play again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-sub">Esc clears your current target lock.</p>
    </div>
  )
}
