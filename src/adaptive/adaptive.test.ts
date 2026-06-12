import { describe, expect, it } from 'vitest'
import { planLesson } from './guided'
import { applyLesson } from './apply'
import { ema } from './filter'
import { confidence } from './confidence'
import { speedToTime } from './constants'
import { emptyLangState, type LangAdaptiveState } from './types'
import { nextWord } from './generator/generate'
import { getModel, alphabetFor } from './generator/models'
import { generateLesson } from './generator/lesson'
import { tokenize } from './generator/tokenize'
import { buildHistogram } from './histogram'

const ALPHABET = 'e t a o i n s r h l d c'.split(' ')
const TARGET = 175 // cpm

function stateWith(masteredTokens: string[]): LangAdaptiveState {
  const s = emptyLangState()
  for (const t of masteredTokens) {
    const e = speedToTime(TARGET) * 0.8
    s.keys[t] = { token: t, emaTimeToType: e, bestTimeToType: e, totalHits: 10, totalMisses: 0, samples: [] }
  }
  return s
}

describe('adaptive engine', () => {
  it('seeds exactly MIN_ALPHABET (6) tokens for a fresh learner', () => {
    const plan = planLesson(emptyLangState(), {
      alphabet: ALPHABET,
      targetCpm: TARGET,
      alphabetSize: 0,
      recover: false,
    })
    expect(plan.included).toEqual(ALPHABET.slice(0, 6))
    // a new key has no data -> confidence 0 -> it becomes the focus
    expect(plan.focus).not.toBeNull()
    expect(plan.included).toContain(plan.focus)
  })

  it('does NOT unlock a 7th token until all 6 seeds are mastered', () => {
    const partial = stateWith(ALPHABET.slice(0, 5)) // only 5 of 6 mastered
    const plan = planLesson(partial, { alphabet: ALPHABET, targetCpm: TARGET, alphabetSize: 0, recover: false })
    expect(plan.included.length).toBe(6) // still just the seed set
    expect(plan.newlyUnlocked).toBeNull()
  })

  it('unlocks exactly one new token when all included are mastered', () => {
    const all6 = stateWith(ALPHABET.slice(0, 6))
    const plan = planLesson(all6, { alphabet: ALPHABET, targetCpm: TARGET, alphabetSize: 0, recover: false })
    expect(plan.included.length).toBe(7)
    expect(plan.newlyUnlocked).toBe(ALPHABET[6])
    expect(plan.focus).toBe(ALPHABET[6]) // the new key is weakest -> focus
  })

  it('confidence is target/your-ema and >=1 when faster than target', () => {
    expect(confidence(null, TARGET)).toBeNull()
    expect(confidence(speedToTime(TARGET), TARGET)).toBeCloseTo(1)
    expect(confidence(speedToTime(TARGET) * 0.5, TARGET)!).toBeGreaterThan(1)
  })

  it('applyLesson folds EMA and tracks best', () => {
    let s = emptyLangState()
    s = applyLesson(s, [{ token: 'e', hits: 5, misses: 0, meanMs: 300 }], 1000)
    expect(s.keys['e'].emaTimeToType).toBe(300)
    expect(s.keys['e'].bestTimeToType).toBe(300)
    s = applyLesson(s, [{ token: 'e', hits: 5, misses: 0, meanMs: 200 }], 2000)
    expect(s.keys['e'].emaTimeToType).toBeCloseTo(ema(300, 200))
    expect(s.keys['e'].bestTimeToType).toBeCloseTo(ema(300, 200)) // best tracks min EMA
    expect(s.lessonCount).toBe(2)
  })

  it('histogram is invalid below 3 distinct keys', () => {
    const r = buildHistogram({ e: { hits: 2, misses: 0 }, t: { hits: 2, misses: 0 } }, { e: [200, 210], t: [220] })
    expect(r.valid).toBe(false)
    const r2 = buildHistogram(
      { e: { hits: 2, misses: 0 }, t: { hits: 2, misses: 0 }, a: { hits: 2, misses: 0 } },
      { e: [200], t: [220], a: [230] },
    )
    expect(r2.valid).toBe(true)
  })
})

describe('pseudo-word generator', () => {
  const rng = makeRng(12345)
  const m = getModel('en')

  it('produces words only from allowed tokens, within length bounds', () => {
    const allowed = new Set(['e', 't', 'a', 'o', 'i', 'n'])
    for (let i = 0; i < 50; i++) {
      const w = nextWord(m, allowed, 'n', rng)
      expect(w.length).toBeGreaterThanOrEqual(1)
      expect(w.length).toBeLessThanOrEqual(10)
      for (const t of w) expect(allowed.has(t)).toBe(true)
    }
  })

  it('seeds the focus token into nearly every word', () => {
    const allowed = new Set(['e', 't', 'a', 'o', 'i', 'n'])
    let withFocus = 0
    const N = 60
    for (let i = 0; i < N; i++) {
      const w = nextWord(m, allowed, 'n', rng)
      if (w.includes('n')) withFocus++
    }
    expect(withFocus / N).toBeGreaterThan(0.8)
  })

  it('generates a full EN lesson line of the requested length', () => {
    const plan = planLesson(emptyLangState(), {
      alphabet: alphabetFor('en'),
      targetCpm: TARGET,
      alphabetSize: 0,
      recover: false,
    })
    const line = generateLesson(m, plan, 'en', { wordsPerLesson: 18, naturalWords: false, pCapitals: 0, pPunct: 0 }, rng)
    expect(line.roman.split(' ').length).toBe(18)
    expect(line.dev).toBeUndefined()
  })

  it('generates a NE lesson with Devanagari that round-trips', () => {
    const mne = getModel('ne')
    const plan = planLesson(emptyLangState(), {
      alphabet: alphabetFor('ne'),
      targetCpm: TARGET,
      alphabetSize: 0,
      recover: false,
    })
    const line = generateLesson(mne, plan, 'ne', { wordsPerLesson: 10, naturalWords: false, pCapitals: 0, pPunct: 0 }, makeRng(99))
    expect(line.dev).toBeDefined()
    expect(line.dev!.length).toBeGreaterThan(0)
    // every roman word tokenizes cleanly
    for (const w of line.roman.split(' ')) {
      expect(tokenize(w, 'ne').length).toBeGreaterThan(0)
    }
  })
})

// deterministic RNG for stable tests
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}
