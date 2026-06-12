import { describe, expect, it } from 'vitest'
import { toDevanagari } from './transliterate'
import { consistency, kogasa, wpm } from './metrics'

describe('transliterate golden pairs', () => {
  const cases: Array<[string, string]> = [
    ['namaste', 'नमस्ते'],
    ['kasto', 'कस्तो'],
    ['ramro', 'रम्रो'],
    ['raamro', 'राम्रो'],
    ['garchhu', 'गर्छु'],
    ['shree', 'श्री'],
    ['ksha', 'क्ष'],
    ['gya', 'ज्ञ'],
    ['k', 'क्'],
    ['ka', 'क'],
    ['kaa', 'का'],
    ['aama', 'आम'],
    ['aamaa', 'आमा'],
    ['ghar', 'घर्'],
    ['mitra', 'मित्र'],
    // trailing bare consonant keeps its virama (no inherent vowel)
    ['dhanyabaad', 'धन्यबाद्'],
    ['dhanyabaada', 'धन्यबाद'],
  ]
  it.each(cases)('%s -> %s', (roman, dev) => {
    expect(toDevanagari(roman)).toBe(dev)
  })

  it('maps devanagari numerals', () => {
    expect(toDevanagari('0123456789')).toBe('०१२३४५६७८९')
  })

  it('danda punctuation', () => {
    expect(toDevanagari('namaste.')).toBe('नमस्ते।')
  })
})

describe('metrics', () => {
  it('wpm: 50 correct chars in 60s = 10 wpm', () => {
    expect(wpm(50, 60)).toBeCloseTo(10)
  })
  it('kogasa(0) = 100 (perfect consistency)', () => {
    expect(kogasa(0)).toBeCloseTo(100)
  })
  it('consistency of flat samples is ~100', () => {
    expect(consistency([40, 40, 40, 40])).toBeCloseTo(100)
  })
  it('consistency of empty samples is 0', () => {
    expect(consistency([])).toBe(0)
  })
})
