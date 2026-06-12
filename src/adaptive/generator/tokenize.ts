import type { Lang } from '../../types'
import { CONSONANTS, MATRAS, VOWELS } from '../../engine/mapping'

/** All roman transliteration tokens the engine understands, longest-first for greedy match. */
export const NE_TOKENS: string[] = [
  ...new Set([...Object.keys(CONSONANTS), ...Object.keys(VOWELS), ...Object.keys(MATRAS)]),
].sort((a, b) => b.length - a.length)

const NE_SET = new Set(NE_TOKENS)

/** Tokenize a roman string into the units the adaptive engine scores. */
export function tokenize(word: string, lang: Lang): string[] {
  if (lang === 'en') {
    return Array.from(word.toLowerCase()).filter((c) => c >= 'a' && c <= 'z')
  }
  // Nepali: greedy longest-prefix match against the transliteration token set.
  const out: string[] = []
  let i = 0
  while (i < word.length) {
    let matched = false
    for (let len = Math.min(3, word.length - i); len >= 1; len--) {
      const tok = word.slice(i, i + len)
      if (NE_SET.has(tok)) {
        out.push(tok)
        i += len
        matched = true
        break
      }
    }
    if (!matched) i += 1 // skip unknown char (space/punct handled upstream)
  }
  return out
}

/** Map a token to the Latin keys it occupies (for the physical-keyboard heatmap). */
export function tokenToKeys(token: string): string[] {
  return Array.from(token.toLowerCase()).filter((c) => c >= 'a' && c <= 'z')
}
