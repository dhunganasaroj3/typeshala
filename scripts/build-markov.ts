// Offline build step: produce order-3 Markov models for EN and NE from corpora.
// Run with: npx tsx scripts/build-markov.ts   (outputs JSON under src/adaptive/generator/)
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PAD, SEP, type MarkovModel } from '../src/adaptive/generator/model'
import { tokenize } from '../src/adaptive/generator/tokenize'
import { EN_WORDS } from '../src/data/words.en'
import { NE_TIER1, NE_TIER2, NE_TIER3, NE_TIER4, NE_TIER5, NE_SENTENCES } from '../src/data/words.ne'
import type { Lang } from '../src/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/adaptive/generator')
const N = 2 // context length (order-3 = predict from previous 2)

function bump(m: MarkovModel, ctx: string, tok: string, by: number) {
  ;(m[ctx] ??= {})[tok] = (m[ctx][tok] ?? 0) + by
}

function build(pairs: Array<[string, number]>, lang: Lang) {
  const model: MarkovModel = {}
  const tokenCount: Record<string, number> = {}
  for (const [word, freq] of pairs) {
    const toks = tokenize(word, lang)
    if (!toks.length) continue
    const padded = [PAD, PAD, ...toks, PAD]
    for (let i = N; i < padded.length; i++) {
      const ctx = padded.slice(i - N, i).join(SEP)
      bump(model, ctx, padded[i], freq)
    }
    for (const t of toks) tokenCount[t] = (tokenCount[t] ?? 0) + freq
  }
  const tokens = Object.keys(tokenCount).sort((a, b) => tokenCount[b] - tokenCount[a])
  return { model, tokens, tokenCount }
}

// ---- English ----
// Base: bundled EN_WORDS (weight 1). Augment with optional freq CSV if present.
const enPairs: Array<[string, number]> = EN_WORDS.map((w) => [w, 1] as [string, number])
const csvPath = resolve(__dirname, 'data/en-freq.csv')
if (existsSync(csvPath)) {
  for (const line of readFileSync(csvPath, 'utf8').split('\n')) {
    const [w, f] = line.split(',')
    if (w && f) enPairs.push([w.trim().toLowerCase(), Number(f) || 1])
  }
}
const en = build(enPairs, 'en')
const enWords = [...new Set(EN_WORDS)].slice(0, 2000)
writeFileSync(
  resolve(OUT, 'model-en.json'),
  JSON.stringify({ lang: 'en', order: 3, tokens: en.tokens, model: en.model, words: enWords }),
)
console.log('EN: %d tokens, %d contexts, seed=%s', en.tokens.length, Object.keys(en.model).length, en.tokens.slice(0, 6).join(' '))

// ---- Nepali (romanized) ----
const NE_POOL = [...NE_TIER1, ...NE_TIER2, ...NE_TIER3, ...NE_TIER4, ...NE_TIER5]
const nePairs: Array<[string, number]> = []
for (const w of NE_POOL) nePairs.push([w.roman, 3])
// add sentence words (split on spaces, strip punctuation) for richer transitions
for (const s of NE_SENTENCES) {
  for (const w of s.roman.split(/\s+/)) {
    const clean = w.replace(/[.|~*]/g, '')
    if (clean) nePairs.push([clean, 1])
  }
}
const ne = build(nePairs, 'ne')
const neWords = [...new Set(NE_POOL.map((w) => w.roman))]
writeFileSync(
  resolve(OUT, 'model-ne.json'),
  JSON.stringify({ lang: 'ne', order: 3, tokens: ne.tokens, model: ne.model, words: neWords }),
)
console.log('NE: %d tokens, %d contexts, seed=%s', ne.tokens.length, Object.keys(ne.model).length, ne.tokens.slice(0, 6).join(' '))
