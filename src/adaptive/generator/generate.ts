import { SPACE_BOOST_BASE, WORD_MAX_LEN, WORD_MIN_LEN, WORD_RETRIES } from '../constants'
import { PAD, SEP, type LangModel } from './model'

type RNG = () => number

function weightedPick(entries: Array<[string, number]>, rng: RNG): string {
  let total = 0
  for (const [, w] of entries) total += w
  let r = rng() * total
  for (const [t, w] of entries) {
    r -= w
    if (r <= 0) return t
  }
  return entries[entries.length - 1][0]
}

/**
 * Build the set of short prefixes (length < WORD_MIN_LEN) that begin a word,
 * indexed by each token they contain. Used to seed the focus token into words.
 */
function buildPrefixIndex(m: LangModel, allowed: Set<string>): Map<string, string[][]> {
  const index = new Map<string, string[][]>()
  const add = (token: string, prefix: string[]) => {
    const arr = index.get(token) ?? []
    arr.push(prefix)
    index.set(token, arr)
  }
  // length-1 prefixes: any allowed token that can start a word
  const startCtx = [PAD, PAD].join(SEP)
  const starts = Object.keys(m.model[startCtx] ?? {}).filter((t) => t !== PAD && allowed.has(t))
  for (const a of starts) {
    add(a, [a])
    // length-2 prefixes a->b
    const ctx2 = [PAD, a].join(SEP)
    const seconds = Object.keys(m.model[ctx2] ?? {}).filter((t) => t !== PAD && allowed.has(t))
    for (const b of seconds) {
      add(a, [a, b])
      add(b, [a, b])
    }
  }
  return index
}

let prefixCacheKey = ''
let prefixCache: Map<string, string[][]> | null = null

function prefixIndex(m: LangModel, allowed: Set<string>): Map<string, string[][]> {
  const key = m.lang + ':' + [...allowed].sort().join(',')
  if (key !== prefixCacheKey) {
    prefixCache = buildPrefixIndex(m, allowed)
    prefixCacheKey = key
  }
  return prefixCache!
}

/** Choose a starting prefix that contains the focus token (if any), else any allowed start. */
function pickFocusPrefix(
  m: LangModel,
  allowed: Set<string>,
  focus: string | null,
  rng: RNG,
): string[] {
  const index = prefixIndex(m, allowed)
  if (focus) {
    const cands = index.get(focus)
    if (cands && cands.length) return cands[Math.floor(rng() * cands.length)].slice()
    if (allowed.has(focus)) return [focus]
  }
  // no focus / no prefix: pick any single allowed start
  const startCtx = [PAD, PAD].join(SEP)
  const starts = Object.keys(m.model[startCtx] ?? {}).filter((t) => t !== PAD && allowed.has(t))
  if (starts.length) return [starts[Math.floor(rng() * starts.length)]]
  return [[...allowed][0] ?? m.tokens[0]]
}

/** Generate one pseudo-word as a token array. */
export function nextWord(
  m: LangModel,
  allowed: Set<string>,
  focus: string | null,
  rng: RNG = Math.random,
): string[] {
  for (let attempt = 0; attempt < WORD_RETRIES; attempt++) {
    const word = pickFocusPrefix(m, allowed, focus, rng)
    let ok = true
    while (true) {
      const ctx = [PAD, PAD, ...word].slice(-2).join(SEP)
      const seg = m.model[ctx] ?? {}
      const entries = Object.entries(seg)
        .filter(([t]) => (t === PAD ? word.length >= WORD_MIN_LEN : allowed.has(t)))
        .map(
          ([t, f]) =>
            [t, t === PAD ? f * SPACE_BOOST_BASE ** word.length : f] as [string, number],
        )
      if (!entries.length) {
        ok = false
        break
      }
      const t = weightedPick(entries, rng)
      if (t === PAD) break
      if (word.length >= WORD_MAX_LEN) {
        ok = false
        break
      }
      word.push(t)
    }
    if (ok && word.length >= WORD_MIN_LEN) return word
  }
  return focus ? [focus] : [m.tokens[0]]
}
