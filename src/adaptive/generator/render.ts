import type { Lang } from '../../types'
import { toDevanagari } from '../../engine/transliterate'

export interface GenWord {
  roman: string
  dev?: string
}

/** Token array -> graded roman string (+ Devanagari for ne, via the existing engine). */
export function renderWord(tokens: string[], lang: Lang): GenWord {
  const roman = tokens.join('')
  return lang === 'ne' ? { roman, dev: toDevanagari(roman) } : { roman }
}
