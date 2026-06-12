import { CONSONANTS, MATRAS, MAX_TOKEN, OTHERS, VIRAMA, VOWELS } from './mapping'

/**
 * Convert a Roman buffer to Devanagari using longest-prefix-first matching and a
 * single "previous token was a consonant" state flag (controls inherent-a / matra /
 * virama behaviour). Output is intentionally unstable per keystroke:
 *   k -> क्   ka -> क   kaa -> का
 * Re-run on the whole current word every keystroke and replace it wholesale.
 */
export function toDevanagari(roman: string): string {
  let i = 0
  let out = ''
  let prevWasConsonant = false

  while (i < roman.length) {
    let matched = false
    const maxLen = Math.min(MAX_TOKEN, roman.length - i)

    for (let len = maxLen; len >= 1; len--) {
      const tok = roman.slice(i, i + len)

      // matra only applies directly after a consonant
      if (prevWasConsonant && tok in MATRAS) {
        out += MATRAS[tok]
        prevWasConsonant = false
        i += len
        matched = true
        break
      }
      if (tok in CONSONANTS) {
        if (prevWasConsonant) out += VIRAMA // conjunct: s + t -> स्त
        out += CONSONANTS[tok]
        prevWasConsonant = true
        i += len
        matched = true
        break
      }
      if (!prevWasConsonant && tok in VOWELS) {
        out += VOWELS[tok]
        i += len
        matched = true
        break
      }
      if (tok in OTHERS) {
        if (prevWasConsonant) out += VIRAMA
        out += OTHERS[tok]
        prevWasConsonant = false
        i += len
        matched = true
        break
      }
    }

    if (!matched) {
      // space / unknown punctuation / latin -> pass through literally
      if (prevWasConsonant) out += VIRAMA
      out += roman[i]
      prevWasConsonant = false
      i += 1
    }
  }

  if (prevWasConsonant) out += VIRAMA // trailing bare consonant: k -> क्
  return out.normalize('NFC')
}
