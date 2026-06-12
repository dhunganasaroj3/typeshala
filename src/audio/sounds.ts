// Synthesized Web Audio sounds — zero asset files.
// One lazily-created AudioContext (resumed on first user gesture).

let ctx: AudioContext | null = null
let master: GainNode | null = null
let volume = 0.7
let enabled = true

function ensureCtx(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(on: boolean) {
  enabled = on
}

export function setVolume(v: number) {
  volume = v
  if (master) master.gain.value = v
}

function tone(
  freq: number,
  durMs: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  startDelayMs = 0,
) {
  const c = ensureCtx()
  if (!c || !master) return
  const t0 = c.currentTime + startDelayMs / 1000
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + durMs / 1000 + 0.02)
}

/** Correct keystroke: tiny triangle blip with pitch jitter. */
export function playTick() {
  const jitter = 1 + (Math.random() - 0.5) * 0.08
  tone(1800 * jitter, 18, 'triangle', 0.07)
}

/** Error: dull low thud. */
export function playThud() {
  tone(140, 70, 'sine', 0.12)
}

/** Combo tier / daily goal: two-note pentatonic chime (E5 -> A5). */
export function playChime() {
  tone(659.25, 110, 'sine', 0.12)
  tone(880, 140, 'sine', 0.12, 90)
}

/** PB / level-up / achievement: 4-note ascending arpeggio C-E-G-C. */
export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone(f, 180, 'triangle', 0.12, i * 130)
    tone(f / 2, 220, 'sine', 0.06, i * 130)
  })
}

/** Game word kill: filtered noise whoosh. */
export function playWhoosh() {
  const c = ensureCtx()
  if (!c || !master) return
  const dur = 0.09
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200
  const g = c.createGain()
  g.gain.value = 0.18
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start()
}
