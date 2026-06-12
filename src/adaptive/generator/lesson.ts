import type { Lang } from '../../types'
import { toDevanagari } from '../../engine/transliterate'
import type { LessonPlan } from '../types'
import { nextWord } from './generate'
import type { LangModel } from './model'
import { renderWord } from './render'
import { tokenize } from './tokenize'

type RNG = () => number

export interface AdaptiveTextSettings {
  wordsPerLesson: number
  naturalWords: boolean
  pCapitals: number // EN only
  pPunct: number
}

const PUNCT: Array<[string, number]> = [
  [',', 9],
  ['.', 8],
  [';', 2],
  ['!', 2],
  ['?', 2],
]

function pickPunct(rng: RNG): string {
  const total = PUNCT.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [p, w] of PUNCT) {
    r -= w
    if (r <= 0) return p
  }
  return ','
}

/** Real words whose tokens are all allowed (and contain focus where possible). */
function pickRealWord(
  m: LangModel,
  allowed: Set<string>,
  focus: string | null,
  lang: Lang,
  rng: RNG,
): string[] | null {
  const ok = m.words.filter((w) => {
    const toks = tokenize(w, lang)
    return toks.length >= 2 && toks.every((t) => allowed.has(t))
  })
  if (!ok.length) return null
  const focused = focus ? ok.filter((w) => tokenize(w, lang).includes(focus)) : []
  const pool = focused.length ? focused : ok
  return tokenize(pool[Math.floor(rng() * pool.length)], lang)
}

export interface GeneratedLesson {
  roman: string
  dev?: string
}

/** Assemble a full lesson line: roman (graded) + dev (ne display). */
export function generateLesson(
  m: LangModel,
  plan: LessonPlan,
  lang: Lang,
  s: AdaptiveTextSettings,
  rng: RNG = Math.random,
): GeneratedLesson {
  const allowed = new Set(plan.included)
  const romanWords: string[] = []
  const devWords: string[] = []
  let last = ''
  let guard = 0

  while (romanWords.length < s.wordsPerLesson && guard < s.wordsPerLesson * 8) {
    guard++
    let toks =
      s.naturalWords && pickRealWord(m, allowed, plan.focus, lang, rng)
        ? (pickRealWord(m, allowed, plan.focus, lang, rng) as string[])
        : nextWord(m, allowed, plan.focus, rng)
    if (!toks.length) continue
    let { roman, dev } = renderWord(toks, lang)
    if (roman === last) continue
    last = roman

    // capitalize (EN only)
    if (lang === 'en' && s.pCapitals > 0 && rng() < s.pCapitals) {
      roman = roman.charAt(0).toUpperCase() + roman.slice(1)
    }
    // trailing punctuation
    if (s.pPunct > 0 && rng() < s.pPunct) {
      const p = pickPunct(rng)
      roman += p
      if (lang === 'ne') dev = toDevanagari(roman)
    }

    romanWords.push(roman)
    devWords.push(dev ?? roman)
  }

  return {
    roman: romanWords.join(' '),
    dev: lang === 'ne' ? devWords.join(' ') : undefined,
  }
}
