# TypeShala — Adaptive Mode (Keybr Clone) BUILD SPEC

A faithful reimplementation of keybr.com's adaptive trainer as a new **"Adaptive"** view in
TypeShala. Client-only, React 19 + Vite + TS + Tailwind v4 + zustand. Supports **English** and
**romanized Nepali** over the *same* engine, which operates on the **roman keystroke alphabet**.

This spec is decisive: one design, concrete numbers, exact file list, numbered build order. It
reuses `src/engine/transliterate.ts`, `src/engine/metrics.ts`, the zustand `persist` pattern from
`src/store/*`, `src/audio/sounds.ts`, the theme tokens, and the `TypingCore` keystroke-capture
patterns (we fork a thin variant rather than overload `TypingCore`).

---

## 0. Decisions locked up front

| Question | Decision |
| --- | --- |
| Confidence model | `confidence = speedToTime(targetCpm) / emaTimeToType` (pure speed ratio, no accuracy term). |
| Smoothing | Per-key EMA, **alpha = 0.1**, infinite history. Track latest + best (min). |
| Unlock gate | Default/forgiving: every included key has **bestConfidence ≥ 1.0**. Recover mode (opt-in): every included key's **current** confidence ≥ 1.0. |
| Start size / growth | `minSize = 6`, add exactly **one** letter per qualifying lesson, frequency order. |
| Target speed | **175 CPM = 35 WPM** default, configurable **75–750 CPM**. |
| Word model | Order-3 Markov (context = previous 2 tokens), plain-JSON table. Min len 3, max len 10, space boost `1.3^len`, up to 6 retries. |
| Weak-key bias | **Seed each word with the focused token** (prefix-seeding), not mid-word reweighting. |
| **NE token granularity** | **Hybrid (DECISION): the adaptive engine + Markov model operate over TRANSLITERATION TOKENS** (`k`, `kh`, `aa`, `ee`, `chh`, `ny`, …), because "weakest key" is pedagogically meaningful for Devanagari and the digraphs are the real learning unit. The **on-screen QWERTY heatmap colors raw Latin keys** (so the physical keyboard stays meaningful) by aggregating token stats down to their constituent Latin chars. EN uses single-char tokens, so EN is just the degenerate case of the same code. |
| Persistence | New slice `useAdaptive` → `localStorage` key **`ts.adaptive.v1`**. XP/streak still flow through existing `useProgress.addActivity`. |
| Integration point | New `View` value `'adaptive'`; new nav entry; new `AdaptiveView` mounted in `App.tsx`. |

Rationale note for the prompt's open question ("which granularity"): **token-level** for the engine/generator,
**char-level** for the keyboard heatmap. This is the only choice that keeps keybr's "drill your weak unit"
semantics correct for Nepali (where `kh` ≠ `k`) while keeping the physical keyboard display honest.

---

## 1. The adaptive engine — pure TS in `src/adaptive/`

All of this is framework-free, deterministic, unit-testable. No React, no zustand imports.

### 1.1 Constants — `src/adaptive/constants.ts`

```ts
export const EMA_ALPHA = 0.1
export const DEFAULT_TARGET_CPM = 175          // 35 WPM
export const MIN_TARGET_CPM = 75
export const MAX_TARGET_CPM = 750
export const MIN_ALPHABET = 6                  // seed size
export const SAMPLE_MIN_MS = 40                // discard < 40ms/char (held/debounce)
export const SAMPLE_MAX_MS = 12000             // discard > 12s/char (AFK)
export const MIN_KEYS_PER_LESSON = 3           // a lesson needs >=3 distinct tokens to be valid
export const WORD_MIN_LEN = 3
export const WORD_MAX_LEN = 10
export const SPACE_BOOST_BASE = 1.3            // space freq *= 1.3^wordLen
export const WORD_RETRIES = 6
export const MARKOV_ORDER = 3                  // context = previous 2 tokens
export const LR_WINDOW = 30                    // learning-rate regression window
export const LR_MIN_R2 = 0.5
export const LR_MAX_PROJECT = 50

export const speedToTime = (cpm: number) => 60000 / cpm      // ms per char
export const cpmToWpm = (cpm: number) => cpm / 5
export const wpmToCpm = (wpm: number) => wpm * 5
```

### 1.2 Data structures — `src/adaptive/types.ts`

```ts
/** One per-key sample recorded after a single lesson. */
export interface KeySample {
  index: number          // lesson ordinal for this key
  ts: number             // epoch ms
  hits: number           // correct presses of this token in the lesson
  misses: number         // typos for this token
  timeToType: number     // raw mean ms/char over correct hits (this lesson)
  filtered: number       // EMA value AFTER applying this sample
}

/** Persisted state for one token (e.g. 'e', or 'kh', 'aa'). */
export interface KeyState {
  token: string
  emaTimeToType: number | null   // latest EMA ms/char  -> current confidence
  bestTimeToType: number | null  // min EMA ever         -> bestConfidence
  totalHits: number
  totalMisses: number
  samples: KeySample[]           // capped to last 60 for learning-rate + profile graph
}

/** Per-language adaptive record (what lives in the store, keyed by Lang). */
export interface LangAdaptiveState {
  keys: Record<string, KeyState>   // token -> state
  lessonCount: number              // lessons completed in this lang
  lastFocus: string | null         // last focused token (UI continuity)
}

/** Derived (not persisted) — computed each lesson for the generator + UI. */
export interface LessonPlan {
  included: string[]      // tokens active this lesson (frequency order)
  focus: string | null    // single weakest included token (confidence < 1), or null
  newlyUnlocked: string | null
  maxSize: number         // minSize + round((total-minSize)*alphabetSize)
}

export interface KeyConfidence {
  token: string
  confidence: number | null      // current: targetTime / ema
  bestConfidence: number | null  // targetTime / best
  calibrated: boolean            // has >=1 valid sample
  hits: number
  misses: number
}
```

### 1.3 Confidence — `src/adaptive/confidence.ts`

```ts
import { speedToTime } from './constants'

/** keybr's exact definition: confidence = targetMsPerChar / yourMsPerChar = yourSpeed/target. */
export function confidence(emaTime: number | null, targetCpm: number): number | null {
  if (emaTime == null || emaTime <= 0) return null
  return speedToTime(targetCpm) / emaTime
}
```

There is **no accuracy term** in this value. Accuracy enters only by excluding typo keystrokes from
the timing sample (§1.5). A calibrated-but-slow key reads confidence near 0; a key at/above target
reads ≥ 1.

### 1.4 EMA filter — `src/adaptive/filter.ts`

```ts
import { EMA_ALPHA } from './constants'
/** filtered = alpha*new + (1-alpha)*prev ; first sample is raw. */
export function ema(prev: number | null, sample: number, alpha = EMA_ALPHA): number {
  return prev == null ? sample : prev + alpha * (sample - prev)
}
```

(Identical maths to the existing `useStats.mergeKeyStats` EMA — intentional parity.)

### 1.5 Per-lesson histogram — `src/adaptive/histogram.ts`

Consumes the `keyBatch` + raw per-key latencies that the typing core already collects, and produces
one validated `{token -> meanMs}` map per lesson.

```ts
import { SAMPLE_MIN_MS, SAMPLE_MAX_MS, MIN_KEYS_PER_LESSON } from './constants'

export interface LessonKeyTiming {
  token: string
  hits: number
  misses: number
  meanMs: number | null   // mean over correctly-typed hits only; null if no valid samples
}

/** latenciesByToken holds only correct-hit latencies already filtered to [40,12000] ms. */
export function buildHistogram(
  hitsMisses: Record<string, { hits: number; misses: number }>,
  latenciesByToken: Record<string, number[]>,
): { timings: LessonKeyTiming[]; valid: boolean } {
  const timings: LessonKeyTiming[] = []
  for (const token of Object.keys(hitsMisses)) {
    const lat = (latenciesByToken[token] ?? []).filter(
      (ms) => ms >= SAMPLE_MIN_MS && ms <= SAMPLE_MAX_MS,
    )
    const meanMs = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null
    timings.push({ token, hits: hitsMisses[token].hits, misses: hitsMisses[token].misses, meanMs })
  }
  const distinct = timings.filter((t) => t.meanMs != null).length
  return { timings, valid: distinct >= MIN_KEYS_PER_LESSON }
}
```

### 1.6 Apply a lesson to per-key state — `src/adaptive/apply.ts`

```ts
import { ema } from './filter'
import type { KeyState, LangAdaptiveState } from './types'
import type { LessonKeyTiming } from './histogram'

const SAMPLE_CAP = 60

/** Pure: returns a NEW LangAdaptiveState with this lesson folded in. */
export function applyLesson(prev: LangAdaptiveState, timings: LessonKeyTiming[]): LangAdaptiveState {
  const keys: Record<string, KeyState> = { ...prev.keys }
  const idx = prev.lessonCount
  for (const t of timings) {
    const k: KeyState = keys[t.token]
      ? { ...keys[t.token], samples: keys[t.token].samples.slice() }
      : { token: t.token, emaTimeToType: null, bestTimeToType: null, totalHits: 0, totalMisses: 0, samples: [] }
    k.totalHits += t.hits
    k.totalMisses += t.misses
    if (t.meanMs != null) {
      const filtered = ema(k.emaTimeToType, t.meanMs)
      k.emaTimeToType = filtered
      k.bestTimeToType = k.bestTimeToType == null ? filtered : Math.min(k.bestTimeToType, filtered)
      k.samples.push({ index: idx, ts: Date.now(), hits: t.hits, misses: t.misses, timeToType: t.meanMs, filtered })
      if (k.samples.length > SAMPLE_CAP) k.samples = k.samples.slice(-SAMPLE_CAP)
    }
    keys[t.token] = k
  }
  return { ...prev, keys, lessonCount: idx + 1 }
}
```

### 1.7 Unlock + focus — `src/adaptive/guided.ts` (the heart)

```ts
import { MIN_ALPHABET } from './constants'
import { confidence } from './confidence'
import type { KeyState, LangAdaptiveState, LessonPlan } from './types'

export interface GuidedOpts {
  alphabet: string[]    // tokens in DESCENDING frequency order (language-specific)
  targetCpm: number
  alphabetSize: number  // user slider 0..1 -> raises maxSize (manual force-include)
  recover: boolean      // false = forgiving (bestConfidence), true = current confidence
}

function conf(k: KeyState | undefined, target: number, recover: boolean): number | null {
  if (!k) return null
  const t = recover ? k.emaTimeToType : (k.bestTimeToType ?? k.emaTimeToType)
  return confidence(t, target)
}

export function planLesson(state: LangAdaptiveState, o: GuidedOpts): LessonPlan {
  const total = o.alphabet.length
  const maxSize = MIN_ALPHABET + Math.round((total - MIN_ALPHABET) * o.alphabetSize)
  const included: string[] = []
  let newlyUnlocked: string | null = null

  for (const token of o.alphabet) {
    if (included.length < MIN_ALPHABET) {            // seed first 6
      included.push(token); continue
    }
    if (included.length < maxSize) {                 // manual slider force-include
      included.push(token); continue
    }
    const best = conf(state.keys[token], o.targetCpm, o.recover)
    if (best != null && best >= 1) { included.push(token); continue }   // already mastered
    // gate: include the NEXT new letter only if EVERY included key is >= 1
    const allMastered = included.every((tk) => {
      const c = conf(state.keys[tk], o.targetCpm, o.recover)
      return c != null && c >= 1
    })
    if (allMastered) { included.push(token); newlyUnlocked = token; break }
    break                                            // first failing token stays locked
  }

  // focus = lowest CURRENT confidence among included keys with confidence < 1
  let focus: string | null = null
  let lowest = Infinity
  for (const tk of included) {
    const c = confidence(state.keys[tk]?.emaTimeToType ?? null, o.targetCpm)
    const cv = c == null ? 0 : c                      // uncalibrated/new key -> 0 -> becomes focus
    if (cv < 1 && cv < lowest) { lowest = cv; focus = tk }
  }
  return { included, focus, newlyUnlocked, maxSize }
}
```

**Plain English:** seed the 6 most frequent tokens; unlock the next token only once every currently
included token has (best-ever) hit confidence ≥ 1; the single weakest included token becomes the
focus and is forced into every generated word. A freshly unlocked token has no data → confidence 0 →
auto-focus until mastered.

### 1.8 Confidence table for UI — `src/adaptive/select.ts`

```ts
export function keyConfidences(state, alphabet, targetCpm, included): KeyConfidence[]
```
Maps every alphabet token to `{confidence, bestConfidence, calibrated, hits, misses}` plus an
`included` flag, for the letter-grid panel and the keyboard heatmap.

### 1.9 Weak-key weighting (summary)

There are **two** independent weak-key mechanisms, both kept exactly as keybr:
1. **Focus selection** (§1.7): the single lowest-confidence included token.
2. **Prefix-seeding** (§2.4): every generated word starts with a Markov prefix that *contains* the
   focus token, so it appears in (nearly) every word. We do **not** reweight individual letter
   probabilities — the word's internal letter mix follows the natural n-gram model.

### 1.10 Optional learning-rate projection — `src/adaptive/learningrate.ts`

Degree-1 polynomial (least-squares line) of WPM vs lesson index over the last `LR_WINDOW=30`
samples of the current session (session = samples since the last >1h gap). Require R² ≥ 0.5; project
forward ≤ 50 lessons until predicted WPM ≥ target → "reach target in N lessons." Powers a Profile
widget; not on the core loop. Ship behind a simple guard so a noisy fit just hides the widget.

---

## 2. Pseudo-word generator — `src/adaptive/generator/`

Order-3 character/token Markov chain, stored as plain JSON, exactly keybr's three quality tricks.

### 2.1 Model shape — `src/adaptive/generator/model.ts`

```ts
export const PAD = '^'                                   // sentinel for word start/end
export type MarkovModel = Record<string, Record<string, number>>  // ctx(2 tokens) -> token -> count
export interface LangModel {
  lang: 'en' | 'ne'
  order: number                 // 3
  tokens: string[]              // alphabet, descending frequency  (drives unlock order)
  model: MarkovModel            // bigram-context transition table
  words: string[]               // top word list, for optional "natural words" mode
}
```

For EN, tokens are single chars. For NE, tokens are transliteration units; a context string joins two
tokens with a `` separator so multi-char tokens never collide.

### 2.2 Build step (offline, committed JSON) — `scripts/build-markov.ts`

Run with `tsx`/`node`. Inputs and outputs:

- **EN:** input is a `word,frequency` list. We ship a **small precomputed table** generated from the
  existing `EN_WORDS` (≈300 words) weighted equally, *augmented* by a committed `data/en-freq.csv`
  of ~3–5k common English words+frequencies (added to the repo under `scripts/data/`). Output:
  `src/adaptive/generator/model-en.json` (`{tokens, model, words}`) + `words-en.json` (top ~2000).
- **NE:** there is no external NE corpus to ship; we **derive it from the existing Nepali corpus**.
  Tokenize every `roman` string in `src/data/words.ne.ts` (NE_TIER1…5, ~250+ words) into
  transliteration tokens via the tokenizer (§2.3), weight by occurrence, build the table. Output:
  `model-ne.json` + `words-ne.json`. (Corpus is small but pronounceable-token coverage is what
  matters; the generator only needs transition stats over the token set, and prefix-seeding handles
  the rest.)

Algorithm (shared, ~25 lines):
```ts
const N = 2                                  // context length (order-3 = predict from prev 2)
for (const [word, freq] of pairs) {
  const toks = [PAD, PAD, ...tokenize(word), PAD]
  for (let i = N; i < toks.length; i++) {
    const ctx = toks.slice(i - N, i).join(SEP)
    bump(model, ctx, toks[i], freq)
  }
}
```
Frequent words dominate via `freq` weighting. Compute the **frequency order** of tokens (sum of
counts) and write it as `tokens` — this is the unlock order. Warn (don't fail) on any seed token with
zero frequency.

### 2.3 Tokenizer — `src/adaptive/generator/tokenize.ts`

- **EN:** `tokenize(w) = Array.from(w.toLowerCase())` (single chars, letters only; drop others).
- **NE:** longest-prefix match against the **roman token set** derived from
  `src/engine/mapping.ts`. Build the token set once as the union of keys of
  `CONSONANTS ∪ VOWELS ∪ MATRAS` (e.g. `kh`, `chh`, `aa`, `ee`, `ng`→`G`, …), sorted by length desc,
  matched greedily (mirrors `MAX_TOKEN = 3` logic in `transliterate.ts`). This guarantees the engine's
  token alphabet is exactly the set of units the transliterator understands, so any generated roman
  word round-trips cleanly through `toDevanagari`.

```ts
import { CONSONANTS, VOWELS, MATRAS, MAX_TOKEN } from '../../engine/mapping'
const NE_TOKENS = [...new Set([...Object.keys(CONSONANTS), ...Object.keys(VOWELS), ...Object.keys(MATRAS)])]
  .sort((a, b) => b.length - a.length)
```

### 2.4 Runtime generator — `src/adaptive/generator/generate.ts`

```ts
import { WORD_MIN_LEN, WORD_MAX_LEN, SPACE_BOOST_BASE, WORD_RETRIES } from '../constants'

export function nextWord(
  m: LangModel, allowed: Set<string>, focus: string | null, rng = Math.random,
): string[] {                                   // returns TOKEN array
  for (let attempt = 0; attempt < WORD_RETRIES; attempt++) {
    const seed = pickFocusPrefix(m, allowed, focus, rng)  // prefix containing focus, allowed-only
    const word = [...seed]
    let ok = true
    while (true) {
      const ctx = [PAD, PAD, ...word].slice(-2).join(SEP)
      const seg = m.model[ctx] ?? {}
      const entries = Object.entries(seg)
        .filter(([t]) => (t === PAD ? word.length >= WORD_MIN_LEN : allowed.has(t)))
        .map(([t, f]) => [t, t === PAD ? f * SPACE_BOOST_BASE ** word.length : f] as [string, number])
      if (!entries.length) { ok = false; break }
      const t = weightedPick(entries, rng)
      if (t === PAD) break                                // word complete
      if (word.length >= WORD_MAX_LEN) { ok = false; break }
      word.push(t)
    }
    if (ok && word.length >= WORD_MIN_LEN) return word
  }
  return focus ? [focus] : [m.tokens[0]]
}
```

- **`pickFocusPrefix`** = keybr's PrefixList: precompute (once per model+filter) all prefixes of
  length < `WORD_MIN_LEN` indexed by each token they contain; return a random one that contains
  `focus` and uses only `allowed` tokens; fallback `[focus]`. This is the entire weak-key bias.
- **Min length:** drop the `PAD` (space/word-end) transition while `word.length < WORD_MIN_LEN`.
- **Short words:** boost `PAD` freq by `1.3^len`.
- **Max length / dead-ends:** retry up to 6 times.

### 2.5 Render a generated word — `src/adaptive/generator/render.ts`

```ts
export interface GenWord { roman: string; dev?: string }
export function renderWord(tokens: string[], lang: Lang): GenWord {
  const roman = tokens.join('')                 // tokens concatenate to the roman keystroke string
  return lang === 'ne' ? { roman, dev: toDevanagari(roman) } : { roman }
}
```
Devanagari is produced by the **existing** `toDevanagari`. The graded text is always the roman
string (matches `LessonItem.roman` semantics already in `types.ts`).

### 2.6 Lesson text assembly — `src/adaptive/generator/lesson.ts`

```ts
export function generateLesson(
  m: LangModel, plan: LessonPlan, settings: AdaptiveSettings, rng = Math.random,
): { roman: string; dev?: string; tokenWords: string[][] } {
  const allowed = new Set(plan.included)
  const wordsWanted = settings.wordsPerLesson           // run length (default 18)
  const out: string[] = []
  let lastRoman = ''
  while (out.length < wordsWanted) {
    let toks = settings.naturalWords
      ? pickRealWord(m, allowed, plan.focus, rng) ?? nextWord(m, allowed, plan.focus, rng)
      : nextWord(m, allowed, plan.focus, rng)
    let w = mangle(toks, settings, rng)                 // capitals / punctuation
    if (w.roman === lastRoman) continue                 // uniqueWords: no immediate repeat
    lastRoman = w.roman
    out.push(w.roman /* + dev tracked in parallel */)
  }
  // join roman with ' ', dev with ' '
}
```

- **naturalWords mode:** filter `m.words` to words whose tokens ⊆ allowed and that contain focus;
  take up to ~1000; if < 15 match, pad with pseudo-words. (EN benefits; NE list is small so it falls
  back to pseudo-words often, which is fine.)
- **mangle** (§6): capitals with prob `pCapitals`, punctuation with prob `pPunct` (weighted table:
  `,`=9 `.`=8 `! ?`=2 …). For NE we mangle the **roman** before transliteration; punctuation passes
  through `toDevanagari` literally (it already maps `.`→`।`), and capitals are an EN-only concept so
  `pCapitals` is force-disabled for NE.

### 2.7 Numbers — separate mode (`numbers.ts`)

Optional. Groups of `3 + floor(rng*4)` digits, first digit non-zero (optional Benford weighting), no
two equal adjacent digits, emit until ~50 chars. Not mixed into word generation. NE renders digits
via `toDevanagari` (mapping already has `0–9`→Devanagari digits). Ship behind a settings toggle;
lower priority than the core loop.

---

## 3. English vs Nepali alphabets, seed letters, unlock order

The `tokens` array in each model JSON **is** the unlock order (descending corpus frequency). Concrete
seeds (first `MIN_ALPHABET = 6`) below; the build script computes the exact order from the corpus, but
these are the expected/target orderings and the seeds are pinned for determinism.

### 3.1 English (`model-en.json`)
- **Alphabet:** 26 lowercase Latin letters (a–z). Capitals/punctuation are post-process mangles, not
  separate tokens.
- **Seed 6 (pinned):** `e, t, a, o, i, n` (top-6 English letter frequency; keybr seeds the model's
  top-6, which matches this).
- **Unlock order after seed (expected):** `s, r, h, l, d, c, u, m, f, p, g, w, y, b, v, k, x, j, q, z`.

### 3.2 Nepali romanized (`model-ne.json`)
- **Alphabet:** the **transliteration token set** from `src/engine/mapping.ts`
  (`CONSONANTS ∪ VOWELS ∪ MATRAS`), e.g. `a, k, r, n, t, i, m, l, s, h, d, p, b, g, y, u, aa, kh, ch,
  ph, bh, gh, dh, th, sh, chh, ny(Y), aa, ee, oo, ai, au, …`.
- **Seed 6 (from NE corpus token frequency; pinned):** `a, k, r, n, t, i`. (These dominate the
  romanized corpus; exact order is recomputed by the build script and frozen into `tokens`.)
- **Unlock order:** by descending frequency over the romanized NE corpus, so common consonants and
  the inherent-`a` vowel unlock first, digraphs (`kh, gh, chh`) and rarer matras (`au, Ri`) last.
- **Heatmap mapping:** each token aggregates onto its Latin keys for the QWERTY heatmap (e.g. `kh`
  contributes to both `k` and `h`); the letter-grid panel shows **tokens**, the keyboard shows
  **Latin keys**.

The only language-specific inputs are: the token set, the frequency order (seed + unlock), and the
corpus. Everything else (engine, generator, UI) is shared.

---

## 4. UI components — faithful Keybr layout, under `src/components/adaptive/`

Three stacked bands (stat bar / typing line / keyboard+heatmap), plus a letter-grid confidence panel
and a Profile view. Tailwind v4 + existing theme tokens (`bg`, `text`, `sub`, `main`, `surface`,
`error`). Reuse `Caret`, `DevanagariPreview`, `ComboCounter` patterns.

```
src/components/adaptive/
  AdaptiveView.tsx          # page shell: owns lesson lifecycle, mounts the 3 bands + panel
  AdaptiveStatBar.tsx       # top band: WPM/CPM toggle, accuracy, time, "to next letter" predictor
  AdaptiveTypingLine.tsx    # single non-scrolling generated line + block caret (forks WordsDisplay)
  AdaptiveInput.tsx         # hidden keystroke-capture + grading (thin fork of TypingCore internals)
  LetterGrid.tsx            # the confidence panel: token tiles colored by confidence, focus/included markers
  OnScreenKeyboard.tsx      # QWERTY with 3 layers: confidence heatmap, finger-zones, next-key highlight
  AdaptiveResults.tsx       # post-lesson summary (uses metrics.ts), feeds XP via useProgress
  ProfileView.tsx           # learning graph + per-key table + target progress + lessons-remaining
  LearningGraph.tsx         # smoothed WPM-over-lessons line (SVG, like Sparkline.tsx)
  PerKeyTable.tsx           # sortable token table: token, WPM, confidence, hits, misses, best
  useAdaptiveLesson.ts      # hook: planLesson -> generateLesson -> on complete -> applyLesson -> next
  keyboardLayout.ts         # QWERTY rows + finger-zone map + Latin-key<-token aggregation
```

### 4.1 `AdaptiveStatBar`
Tiles (big number + caption): **Speed** (WPM default, CPM toggle from settings), **Accuracy** (%),
**Time** (current run seconds), **Score/streak figure** (lesson count + current focus token), and a
**"to next letter"** predictor (from `learningrate.ts`, or "—" when no fit). The active key set is
communicated by the keyboard/letter-grid coloring, not a tile (keybr parity).

### 4.2 `AdaptiveTypingLine`
- One centered line, **no horizontal scroll**; a fixed batch (`wordsPerLesson`) that fits one line,
  then regenerate. Forks `WordsDisplay`'s span-coloring:
  - typed-correct → `text-text` (dim it slightly vs default); current char → block caret
    (reuse `Caret` against the active span ref); pending → `text-sub`; error → `text-error` flash.
- **NE display:** keep grading on the **roman** string (caret advances per roman keystroke).
  Show Devanagari via the existing `DevanagariPreview` (live in-progress word) above the line, OR an
  inline token-pair render. **Decision:** reuse `DevanagariPreview` above the line (lowest risk,
  already built) and render the roman tokens in the line itself. The full-lesson `dev` string is
  available for an optional ghosted Devanagari underline later.

### 4.3 `LetterGrid` (confidence panel)
Token tiles, colored by confidence via a red→green ramp (reuse the `rampColor` idea from
`KeyHeatmap.tsx`, but invert: low confidence = red, high = green):
- gray/`?` = uncalibrated; red = low; green (conf ≥ 1) = mastered.
- **focus token** = distinct ring/glow; **manually-included** (slider) token = underscore marker.
- hover tooltip: exact confidence + WPM + hits/misses. Tokens shown in unlock order; locked tokens
  dimmed.

### 4.4 `OnScreenKeyboard`
Full QWERTY (reuse `KeyHeatmap`'s `ROWS`). **Three independent layers**, each its own settings toggle:
1. **Confidence heatmap** (always on): each Latin key colored by aggregated token confidence.
2. **Finger-zone coloring** (`showZones`): solid hues per finger column (pinky/ring/middle/index ×2),
   from `keyboardLayout.ts`.
3. **Next-key highlight** (`highlightNextKey`): highlight the Latin key for the next expected roman
   char (for NE, the next char of the current token).

### 4.5 `ProfileView`
- **`LearningGraph`** — WPM over lessons (smoothed), SVG like `Sparkline.tsx`. Real-data driven from
  `samples`/results.
- **`PerKeyTable`** — per-token: WPM, confidence, best, hits, misses; sortable; clearly labeled.
- **Target progress** — chosen target WPM + progress + "lessons remaining" from `learningrate.ts`.
- Analytics-focused, no streak/stars here (keybr parity); XP/streak stay in the global Header.

---

## 5. Persistence — new zustand slice + XP/streak integration

### 5.1 `src/store/useAdaptive.ts` (key `ts.adaptive.v1`)

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../types'
import type { LangAdaptiveState } from '../adaptive/types'
import type { LessonKeyTiming } from '../adaptive/histogram'
import { applyLesson } from '../adaptive/apply'

export interface AdaptiveSettings {
  targetCpm: number        // 175 default, 75..750
  alphabetSize: number     // 0..1 slider (force-include)
  recover: boolean         // stricter unlock; default false
  naturalWords: boolean    // real words vs generated; default false (generated)
  pCapitals: number        // 0..1; EN only
  pPunct: number           // 0..1
  numbersMode: boolean     // separate numbers drill; default false
  wordsPerLesson: number   // run length; default 18
  unit: 'wpm' | 'cpm'      // mirrors keybr; default 'wpm'
  showZones: boolean
  highlightNextKey: boolean
}

interface AdaptiveStore {
  byLang: Record<Lang, LangAdaptiveState>
  settings: AdaptiveSettings
  recordLesson: (lang: Lang, timings: LessonKeyTiming[]) => void   // calls applyLesson
  setSettings: (patch: Partial<AdaptiveSettings>) => void
  resetLang: (lang: Lang) => void
  importAll: (data: Partial<AdaptiveStore>) => void
}
```

- `byLang` seeded with `{ en: empty, ne: empty }` where empty = `{ keys: {}, lessonCount: 0, lastFocus: null }`.
- `recordLesson` = `set({ byLang: { ...s.byLang, [lang]: applyLesson(s.byLang[lang], timings) } })`.
  Pure engine call → store stays thin, mirroring `useStats.mergeKeyStats`.
- Persisted under **`ts.adaptive.v1`**. `samples` are capped (§1.6) so localStorage stays bounded.

### 5.2 XP / streak / global stats integration
On each completed adaptive lesson, `AdaptiveView` runs the **existing** pipeline so Adaptive mode is a
first-class XP source:
1. Build a `TestResult` (`mode: 'lesson'`, `mode2: 'adaptive-' + lang`) via `metrics.ts`
   (`wpm`, `cpm`, `accuracy`, `consistency`) and save through `useStats.saveResult`.
2. Call `useProgress.addActivity({ xp, ts, lang, keystrokes, perfect })` — drives XP, level-ups,
   daily goal, streak exactly like Test/Lesson modes (returns `ProgressEvents` → feed
   `runResultPipeline`/`CelebrationLayer`).
3. Call `useStats.mergeKeyStats(lang, keyBatch)` so the **global** Stats heatmap still reflects
   adaptive practice (Latin-char level), in addition to the adaptive slice's token-level model.
4. Call `useAdaptive.recordLesson(lang, timings)` for the adaptive token model.

No changes to `useProgress`/`useStats` shapes — Adaptive plugs into existing contracts.

---

## 6. Settings

Add an **Adaptive** section to `src/components/settings/SettingsView.tsx`, bound to
`useAdaptive.settings`:

- **Lesson content:** Generated (pseudo-words) ⟷ Words (real) — `naturalWords` toggle.
- **Capitals** — `pCapitals` slider 0..1 (disabled/hidden when `lang === 'ne'`).
- **Punctuation** — `pPunct` slider 0..1.
- **Numbers** — `numbersMode` toggle (separate drill).
- **Target speed** — slider in WPM, stored as CPM (`75..750` CPM = `15..150` WPM); drives the unlock
  gate + predictor.
- **Alphabet size** — `alphabetSize` slider 0..1 with ←/→ arrows (force-include beyond the gate);
  force-included tokens get the underscore marker in `LetterGrid`.
- **Recover mode** — `recover` toggle (stricter unlock; default off).
- **Run length** — `wordsPerLesson` slider (default 18).
- **Speed unit** — WPM ⟷ CPM (`unit`).
- **Keyboard display** — `showZones`, `highlightNextKey` toggles (sounds reuse the global
  `soundOn`/`volume` from `useSettings`).

Language itself stays the global `useSettings.lang` toggle (en/ne), shared with the rest of the app.

---

## 7. Numbered build order

1. **Types + constants.** `src/adaptive/{constants,types}.ts`. Lock all numbers from §0.
2. **Pure engine.** `filter.ts`, `confidence.ts`, `histogram.ts`, `apply.ts`, `guided.ts`,
   `select.ts`. Unit-test `guided.planLesson` (seed=6, one-at-a-time unlock, focus=weakest,
   recover-vs-forgiving) and `apply.applyLesson` (EMA + best) with Vitest.
3. **Tokenizer.** `generator/tokenize.ts` (EN single-char; NE longest-prefix over mapping tokens).
   Test that every generated NE roman word round-trips through `toDevanagari` without leftover
   viramas where unintended.
4. **Model build script + committed JSON.** `scripts/build-markov.ts` + `scripts/data/en-freq.csv`.
   Generate `model-en.json`, `words-en.json` (from EN corpus), `model-ne.json`, `words-ne.json`
   (from `words.ne.ts`). Add an npm script `"build:markov"`. Commit the JSON.
5. **Generator.** `generator/{model,generate,render,lesson,numbers}.ts`. Test word lengths ∈ [3,10],
   allowed-set restriction, and focus presence in (nearly) every word.
6. **Store slice.** `src/store/useAdaptive.ts` (`ts.adaptive.v1`) + default settings.
7. **Routing.** Add `'adaptive'` to `View` in `types.ts`; add nav entry in `Header.tsx`; mount
   `AdaptiveView` in `App.tsx`.
8. **Keystroke capture.** `AdaptiveInput.tsx` (fork `TypingCore`'s `onKeyDown`/run-ref pattern;
   emit per-token `hits/misses` + correct-hit latencies; for NE, map the typed Latin char to its
   token via the active-position context so timings accrue to tokens).
9. **Typing line + keyboard + grid.** `AdaptiveTypingLine.tsx` (fork `WordsDisplay` + reuse `Caret`),
   `OnScreenKeyboard.tsx` (+ `keyboardLayout.ts`), `LetterGrid.tsx`. Wire `DevanagariPreview` for NE.
10. **Lesson lifecycle.** `useAdaptiveLesson.ts` + `AdaptiveView.tsx`: plan → generate → capture →
    histogram → `recordLesson` → next plan. `AdaptiveStatBar.tsx`.
11. **Results + XP/streak integration.** `AdaptiveResults.tsx`; wire `saveResult`, `addActivity`,
    `mergeKeyStats`, `runResultPipeline`/`CelebrationLayer` (§5.2).
12. **Profile.** `ProfileView.tsx`, `LearningGraph.tsx`, `PerKeyTable.tsx`; optional
    `learningrate.ts` predictor (graceful when no fit).
13. **Settings.** Add the Adaptive section (§6) to `SettingsView.tsx`.
14. **Polish + parity pass.** Finger-zone + next-key layers, manual-include underscore markers,
    sounds via existing `playTick`/`playThud`, reduced-motion via `usePrefersReducedMotion`.
15. **Cleanup.** Delete `.keybr-research/` once the engine is verified against it. `npm run lint`,
    `npm run test`, `npm run build`.

---

### Reuse checklist (existing assets wired in)
- `src/engine/transliterate.ts` `toDevanagari` — NE rendering + tokenizer source of truth.
- `src/engine/mapping.ts` — NE token set (`CONSONANTS/VOWELS/MATRAS`, `MAX_TOKEN`).
- `src/engine/metrics.ts` — `wpm/cpm/accuracy/consistency` for results + stat bar.
- `src/store/useProgress.ts` `addActivity` — XP, level, daily goal, streak.
- `src/store/useStats.ts` `saveResult`/`mergeKeyStats` — global history + heatmap (note: it already
  uses EMA α=0.1, same as the adaptive engine — intentional parity).
- `src/audio/sounds.ts` — `playTick`/`playThud`/`playChime`/`playFanfare`.
- `src/data/themes.ts` + index.css tokens — colors.
- `src/components/typing/{Caret,WordsDisplay,DevanagariPreview,ComboCounter}.tsx` — typing line.
- `src/components/stats/{KeyHeatmap,Sparkline}.tsx` — heatmap/graph patterns.
- `src/game/celebrate.ts` `runResultPipeline` + `CelebrationLayer` — post-lesson celebrations.
