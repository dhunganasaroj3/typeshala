# TypeShala (टाइपशाला) — Build Plan

Free, client-only, heavily gamified English + Nepali typing tutor.
React 19 + Vite 8 + TypeScript, deployed to GitHub Pages (`gh-pages` branch, no Actions).
One build session. No backend, no accounts, no multiplayer servers. Everything in localStorage.

---

## 1. MVP Feature List (this session — all buildable, nothing speculative)

1. **Typing Test screen** (the home screen, Monkeytype-style): starts on first keystroke, Tab to restart, modes = Time (15/30/60) and Words (10/25/50), English + Nepali (romanized phonetic), smooth animated caret, per-grapheme coloring (correct/incorrect/pending), live WPM readout, results card with WPM / Raw / Accuracy / Consistency + per-second WPM SVG chart with error markers.
2. **Nepali phonetic engine**: ~200-line rule-based Roman→Devanagari transliterator (own code, no deps, no network). Lessons/tests grade the canonical roman keystroke sequence; Devanagari renders live above the input.
3. **Lessons**: structured curriculum — 20 English lessons (home row → symbols) + 20 Nepali lessons (consonants → matras → conjuncts → sentences/proverbs), 95% accuracy gate, 1–3 star score, romanization hints that fade.
4. **Gamification spine**: XP (mastery-weighted formula), levels with Nepali titles, daily streak with grace + streak shields, combo counter with additive bonuses, 15 achievements, celebration tiers (keystroke tick → XP count-up → confetti → epic), daily goal ring.
5. **Two games**: "Khukuri Strike" (ZType-style canvas shooter) and "Saathi Racer" (race a bot + ghost of your own best run, DOM). Both bilingual.
6. **Stats screen**: PB cards, history list, WPM trend sparkline, per-key error heatmap on a virtual keyboard, GitHub-style activity calendar, JSON export/import.
7. **Theme system**: 6 themes via ~10 CSS custom-property tokens, persisted, no-flash head script, `prefers-reduced-motion` respected + in-app motion/sound toggles.
8. **Sound**: synthesized Web Audio (no asset files) — keystroke tick, error thud, combo chime, PB fanfare. Volume + on/off in settings.
9. **Deploy**: `gh-pages -d dist`, `base: '/typeshala/'`.

**Explicitly cut from MVP** (documented as future work): Traditional/Remington & Preeti layouts, PWA/service worker, Lok Sewa certificate mode, adaptive Keybr engine, daily quests, bonus chests, IndexedDB replays, mobile IME support (desktop-first; mobile shows a "best on a physical keyboard" notice).

---

## 2. App Structure

### Views (no router — a `view` field in the zustand UI store; header nav buttons)
- `test` — typing test (default)
- `lessons` — curriculum grid → lesson player (same TypingCore component)
- `games` — game picker → KhukuriStrike | SaathiRacer
- `stats` — dashboard
- `settings` — theme, sound, motion, export/import

### Component tree
```
<App>
 ├─ <Header>            logo · nav · streak flame · level/XP bar · daily goal ring
 ├─ <main> (switch on ui.view)
 │   ├─ <TestView>
 │   │    ├─ <TestConfigBar>      time/words · duration · language toggle
 │   │    ├─ <TypingCore>         ← shared engine component
 │   │    │    ├─ <WordsDisplay>  memoized grapheme spans
 │   │    │    ├─ <Caret>         abs-positioned, ref+rAF, outside React renders
 │   │    │    ├─ <DevanagariPreview>  live transliteration (Nepali only)
 │   │    │    ├─ <ComboCounter>
 │   │    │    └─ <HiddenInput>
 │   │    └─ <ResultsCard>        stats + <WpmChart> (SVG) + XP count-up
 │   ├─ <LessonsView>  → <LessonGrid> · <LessonPlayer> (wraps TypingCore + hints + stars)
 │   ├─ <GamesView>    → <GamePicker> · <KhukuriStrike> · <SaathiRacer>
 │   ├─ <StatsView>    → <PBCards> <Sparkline> <KeyHeatmap> <ActivityCalendar> <HistoryList>
 │   └─ <SettingsView>
 ├─ <CelebrationLayer>  confetti canvas + toast queue (achievement/level-up/PB)
 └─ <Footer>
```

### File layout under `src/`
```
src/
  main.tsx, App.tsx, index.css        (Tailwind v4 @import + @theme tokens + theme palettes)
  engine/
    transliterate.ts                  roman→Devanagari core loop
    mapping.ts                        consonant/vowel/matra/other tables
    graphemes.ts                      Intl.Segmenter helpers, NFC normalize
    metrics.ts                        wpm/raw/accuracy/kogasa/consistency
    keystroke.ts                      keydown capture, timing, per-key logging
  data/
    lessons.en.ts                     English curriculum
    lessons.ne.ts                     Nepali curriculum (roman + dev + en gloss)
    words.en.ts                       top-1k English words
    words.ne.ts                       Nepali corpus tiers (words/sentences/proverbs)
    achievements.ts                   achievement definitions
    themes.ts                         theme token sets
  store/
    useProgress.ts                    XP, level, streak, achievements, daily (persist)
    useStats.ts                       results history, PBs, key profile, days (persist)
    useSettings.ts                    theme, sound, motion, language (persist)
    useUI.ts                          view, modal, celebration queue (not persisted)
  game/
    gamification.ts                   XP formula, level curve, streak logic, achievement checks
    celebrate.ts                      tiered celebration dispatcher (confetti/sound/toast)
  audio/
    sounds.ts                         Web Audio synth: tick/thud/chime/fanfare
  components/
    Header.tsx, Footer.tsx, CelebrationLayer.tsx
    typing/ TypingCore.tsx WordsDisplay.tsx Caret.tsx DevanagariPreview.tsx
            ComboCounter.tsx ResultsCard.tsx WpmChart.tsx TestConfigBar.tsx
    lessons/ LessonGrid.tsx LessonPlayer.tsx
    games/ GamePicker.tsx KhukuriStrike.tsx SaathiRacer.tsx
    stats/ PBCards.tsx Sparkline.tsx KeyHeatmap.tsx ActivityCalendar.tsx HistoryList.tsx
    settings/ SettingsView.tsx
  hooks/
    usePrefersReducedMotion.ts, useGameLoop.ts (rAF + delta-time)
```

---

## 3. Nepali Romanized Transliteration Engine

Pure rule-based, longest-prefix-first, single-boolean state machine (sanscript algorithm + Ashesh case conventions). No network, no sanscript dependency at runtime.

### Mapping tables (`mapping.ts`)
```ts
export const VIRAMA = "्"; // U+094D

export const CONSONANTS: Record<string, string> = {
  k:"क", kh:"ख", g:"ग", gh:"घ", G:"ङ",
  ch:"च", c:"च", chh:"छ", Ch:"छ", j:"ज", z:"ज", jh:"झ", Y:"ञ",
  T:"ट", Th:"ठ", D:"ड", Dh:"ढ", N:"ण",          // capitals = retroflex
  t:"त", th:"थ", d:"द", dh:"ध", n:"न",
  p:"प", ph:"फ", f:"फ", b:"ब", bh:"भ", m:"म",
  y:"य", r:"र", l:"ल", w:"व", v:"व",
  sh:"श", Sh:"ष", S:"ष", s:"स", h:"ह",
  x:"क्ष", ksh:"क्ष", gy:"ज्ञ",   // conjunct shortcuts; "tra" forms naturally via t+्+r
};
// NEVER map ng→ङ or ny→ञ (verified bug: dhanyabaad→धञबाद्); ङ/ञ live on G/Y.

export const VOWELS: Record<string, string> = {        // independent (word-initial / after vowel)
  a:"अ", aa:"आ", A:"आ", i:"इ", ii:"ई", ee:"ई", I:"ई",
  u:"उ", uu:"ऊ", oo:"ऊ", U:"ऊ", e:"ए", ai:"ऐ", o:"ओ", au:"औ", Ri:"ऋ",
};

export const MATRAS: Record<string, string> = {        // after a consonant; a = inherent = ""
  a:"", aa:"ा", A:"ा", i:"ि", ii:"ी", ee:"ी", I:"ी",
  u:"ु", uu:"ू", oo:"ू", U:"ू", e:"े", ai:"ै", o:"ो", au:"ौ", Ri:"ृ",
};

export const OTHERS: Record<string, string> = {
  M:"ं", "*":"ं", "~":"ँ", H:"ः", ".":"।", "|":"।", "/":"",   // "/" = silent cluster-breaker
  "0":"०","1":"१","2":"२","3":"३","4":"४","5":"५","6":"६","7":"७","8":"८","9":"९",
};
export const MAX_TOKEN = 3;   // chh, ksh, Dha…
```

### Algorithm (`transliterate.ts`)
```
toDevanagari(roman):
  i = 0; out = ""; prevWasConsonant = false
  while i < roman.length:
    matched = false
    for len = min(MAX_TOKEN, remaining) down to 1:       # longest match first
      tok = roman.slice(i, i+len)
      if prevWasConsonant && tok in MATRAS:
        out += MATRAS[tok]; prevWasConsonant = false; i += len; matched = true; break
      if tok in CONSONANTS:
        if prevWasConsonant: out += VIRAMA               # conjunct: s+t → स्त
        out += CONSONANTS[tok]; prevWasConsonant = true; i += len; matched = true; break
      if !prevWasConsonant && tok in VOWELS:
        out += VOWELS[tok]; i += len; matched = true; break
      if tok in OTHERS:
        if prevWasConsonant: out += VIRAMA
        out += OTHERS[tok]; prevWasConsonant = false; i += len; matched = true; break
    if !matched:                                          # space/punct/unknown → literal
      if prevWasConsonant: out += VIRAMA
      out += roman[i]; prevWasConsonant = false; i += 1
  if prevWasConsonant: out += VIRAMA                      # trailing: "k" → क्
  return out.normalize("NFC")
```

### Rules of use in the app
- **Source of truth = the raw roman buffer.** Re-transliterate the current word on every keystroke (microseconds); replace the rendered Devanagari word wholesale (output is intentionally unstable: `k`→क्, `ka`→क, `kaa`→का). Backspace deletes one **roman** char, then re-render.
- **Grading is deterministic**: every Nepali lesson word stores its canonical roman sequence; we grade keydown-by-keydown against that roman string and show Devanagari as live feedback. No transliteration ambiguity in scoring.
- All grapheme work (highlighting, cursor, counts) via `Intl.Segmenter('ne', { granularity:'grapheme' })`, never `string[i]`.
- Golden unit tests: `namaste→नमस्ते`, `kasto→कस्तो`, `ramro→राम्रो`, `garchhu→गर्छु`, `shree→श्री`, `ksha→क्ष`, `gya→ज्ञ`, `k→क्`/`ka→क`/`kaa→का`, `aama→आमा`, `0-9→०-९`, `dhanyabaad→धन्यबाद`.
- Conjunct rendering is free: emit consonant + ् and let HarfBuzz + bundled Noto Sans Devanagari shape क्ष/त्र/र्म.

---

## 4. Lesson Curriculum

### Data structure (`data/lessons.*.ts`)
```ts
export interface Lesson {
  id: string;                 // "en-01", "ne-12"
  lang: "en" | "ne";
  unit: string;               // "Home Row", "Matras"
  title: string;              // "f and j", "आ-कार (aa)"
  newKeys: string[];          // keys/tokens introduced (drives keyboard highlight + hints)
  items: LessonItem[];        // typed in sequence, joined by spaces into one drill text
  minAccuracy: number;        // 0.95 gate to pass
  stars: { two: number; three: number };  // accuracy thresholds: 0.97 / 0.99
}
export interface LessonItem {
  roman: string;              // what is graded (English: the text itself)
  dev?: string;               // Devanagari render (Nepali only; precomputed = engine output)
  en?: string;                // English gloss shown as reward tooltip (Nepali only)
}
```
Pass = `accuracy >= minAccuracy` over the whole drill. Stars: 1★ pass, 2★ ≥97%, 3★ ≥99%. Stars and pass state stored per lesson id.

### English track (20 lessons, 7 units)
| # | Unit | New keys | Drill content |
|---|------|----------|---------------|
| en-01..05 | Home Row | fj · dk · sl · a; · gh | key drills → home-row words (ask, lass, flask, glad, hash) |
| en-06..09 | Top Row | ei · ru · ty · wo qp | like, slide, true, quote, power |
| en-10..12 | Bottom Row | nm · vc b · xz ,. | name, voice, zebra, mixed words |
| en-13..14 | Shift & Caps | shift, capitals | Sentence-start caps, names |
| en-15..16 | Punctuation | ' " ! ? - : ; | full sentences |
| en-17..18 | Numbers | 56 47 38 29 10 | number+word mixes |
| en-19..20 | Flow | — | paragraph drill · capstone 1-min test |

Word content generated from `words.en.ts` (top-1k list) filtered to unlocked keys, plus hand-written sentences for 13–20.

### Nepali track (20 lessons, 8 units) — maps 1:1 to engine rules
| # | Unit | New tokens | Sample items (roman → dev) |
|---|------|-----------|----------------------------|
| ne-01 | Concept | a, k g m n r l s h | ka, ma, na; how inherent-अ works (live preview demo text) |
| ne-02..03 | Bare consonants | j b p d t w y, ch | ghar→घर, man→मन, kalam→कलम, sadak→सडक, nagar→नगर |
| ne-04..07 | Matras (one per lesson) | aa · i/ii · u/uu · e/ai/o/au | aamaa→आमा, didi→दिदी, guru→गुरु, mero→मेरो, dherai→धेरै, baato→बाटो |
| ne-08..09 | Aspirates | kh gh chh jh th dh ph bh | khaanaa→खाना, chha→छ, bhaat→भात, dudh→दूध |
| ne-10..11 | Retroflex BOSS | T Th D Dh N | minimal pairs: taalaa ताला vs Taalaa टाला; thulo→ठूलो, Dhokaa→ढोका |
| ne-12 | Sibilants & signs | sh Sh S, M ~ H | shahar, Sha, sansaar (sa\*saar→संसार), gaau~→गाउँ, duHkha→दुःख |
| ne-13..14 | Conjuncts BOSS | implicit virama, ksh gy | namaste→नमस्ते, raamro→राम्रो, mitra→मित्र, prashna→प्रश्न, gyaan→ज्ञान, vidyaalaya→विद्यालय |
| ne-15 | Verb endings | trailing halanta | chhan→छन्, garchha→गर्छ, garnuhos→गर्नुहोस् |
| ne-16..17 | Top-100 words | — | chha, ra, ma, ho, ke, yo, pani, laai, garnu… (frequency drill) |
| ne-18..19 | Sentences + numerals | . (danda), digits | "namaste. tapaain laai kasto chha." → नमस्ते। तपाईं लाई कस्तो छ। + ०-९ |
| ne-20 | Proverbs capstone | — | 5 ukhaan, e.g. "jasto ropyo, tyastai phalchha." → जस्तो रोप्यो, त्यस्तै फल्छ। |

Nepali corpus embedded verbatim from research (`words.ne.ts`): Tier1 bare-consonant words, Tier2 matra ladders, Tier3 nasal signs, Tier4 conjuncts, Tier5 verb endings, 36 sentences, 14 proverbs — each `{roman, dev, en}`.

**Hints**: LessonPlayer shows roman-segmented hint ("gh-a-r") under the Devanagari for `newKeys` items on first attempt, hidden on repeats. Passing ne-13/14 unlocks the "घरको बाघ" achievement.

---

## 5. Gamification System

All logic in `game/gamification.ts`; state in `useProgress` (zustand + persist).

### XP formula (per completed test/lesson/game)
```ts
const words   = correctChars / 5;
const accMult = acc >= 0.97 ? 1.5 : acc >= 0.93 ? 1.2 : acc >= 0.85 ? 1.0 : 0.5;
const speedMult = clamp(wpm / personalAvgWpm(last10, lang), 0.8, 1.3);  // 1.0 if <10 results
const comboBonus = Math.floor(maxCombo / 50) * 5;
let xp = Math.round(words * accMult * speedMult) + comboBonus;
if (firstActivityToday) xp += 20;
if (firstTimePassingThisLesson) xp += 10;
if (acc === 1) xp += 15;
```
XP encodes mastery (accuracy × relative speed), self-balances English vs Nepali (per-language average), and soft-fails spam (<85% acc).

### Levels
- `xpToReach(level) = round(60 * level^1.7)` cumulative. Level 2 in one good session.
- Titles every 5 levels: 1 सिकारु Sikaru · 5 अभ्यासी Abhyasi · 10 लेखनदास Lekhandas · 15 टाइपवीर Typeveer · 20 डाँफे Danphe · 25+ सगरमाथा Sagarmatha.
- Header shows level + proximity framing: "23 XP to Level 7" (goal-gradient), animated XP bar (motion).

### Daily goal + streak
- Daily goal fixed at **60 XP** (≈ 2 short drills) for MVP. Header ring fills toward it.
- Streak day = goal met. Day boundary = local 3 AM grace.
- **Streak shields**: earn 1 per 7-day streak, bank max 2, auto-spent on a missed day (preserves, doesn't increment); toast next day "🛡 shield saved your streak".
- Milestones: 3 / 7 / 14 / 30 / 100 days → escalating celebrations; 7-day = full confetti + shield + badge.

### Combo
- Consecutive correct keystrokes; counter fades in at 10+, near the caret.
- Tiers: 25 "Nice" → 50 "Hot 🔥" (+5 XP) → 100 "Blazing" (+5 XP) → 200 "डाँफे mode" (+5 XP, subtle background hue shift).
- Error: silent reset (counter fades, soft thud — no red flash, no shake). Additive bonuses only, never multipliers.

### Achievements (15) — `data/achievements.ts`, each pays 25–100 XP
| id | Name | Condition |
|----|------|-----------|
| first-steps | पहिलो पाइला First Steps | complete first test or lesson |
| en-30 / en-60 / en-90 | Swift / Rapid / Sagarmaatha Speed | 30 / 60 / 90 WPM English (test ≥30s) |
| ne-15 / ne-30 | नेपाली टाइपिस्ट / Danphe Fingers | 15 / 30 WPM Nepali (test ≥30s) |
| perfect-10 | Sharpshooter | 10 drills at 100% accuracy |
| streak-7 / streak-30 | साताko आगो Week of Fire / Mahina Master | 7 / 30-day streak |
| combo-200 | Combo Danphe | reach a 200 combo |
| keys-100k | Lakh Keys Club | 100,000 lifetime keystrokes |
| dui-bhasa | दुई भाषा Dui Bhasa | English + Nepali activity same day |
| conjunct-boss | घरको बाघ | pass both conjunct lessons (ne-13, ne-14) 3★-eligible (≥97%) |
| game-1k | Khukuri Warrior | score 1,000+ in Khukuri Strike |
| ghost-beat | Ghost Buster | beat your own ghost in Saathi Racer |
| bihani | बिहानी Bihani | complete a drill before 7 AM (quirky/discoverable) |

Locked achievements shown greyed with progress fractions ("64,200 / 100,000 keys").

### Celebration tiers (`game/celebrate.ts` — single dispatcher, queues, never stacks two Large)
| Tier | Trigger | Effect |
|------|---------|--------|
| Micro | correct keystroke | <10ms synth tick (pitch ±4% jitter); error = dull thud |
| Small | drill complete | XP count-up ticker (800ms), results card slide-in |
| Medium | daily goal, combo tier | goal-ring pulse + chime, small confetti burst from ring |
| Large | **new PB** (≥1 WPM better, drill ≥30s), level-up, achievement, streak milestone | canvas-confetti full burst + fanfare + badge toast + "NEW RECORD" stamp |
| Epic | 7/30/100-day streak, curriculum complete | bespoke big confetti (danphe color palette: blue/green/red) + shareable moment |
All gated by `prefers-reduced-motion` + settings toggles; `disableForReducedMotion: true` on confetti.

### Sound design (`audio/sounds.ts` — synthesized, zero asset files)
One lazily-resumed `AudioContext` (`latencyHint:'interactive'`, created on first keydown):
- **tick**: 4ms triangle blip ~1800Hz, gain 0.15, ±4% playbackRate jitter
- **thud** (error): 60ms sine 140Hz with fast decay, quieter
- **chime** (combo/goal): two-note pentatonic (E5→A5) sine, 120ms
- **fanfare** (PB/level/achievement): 4-note ascending arpeggio (C-E-G-C), 600ms, triangle+sine
- **whoosh** (game word kill): filtered noise burst 80ms
Master gain node, volume slider, mute toggle persisted in settings.

---

## 6. Games (both bilingual; language follows the global toggle; words from `words.*` tiers)

### Game 1 — Khukuri Strike (canvas, ZType-style)
- Enemy ships descend carrying words (English text or Devanagari with its roman key sequence precomputed). First typed letter locks target (word highlights); each correct keydown fires a laser + particle hit; word complete = explosion + small screen shake (motion-gated).
- Wrong key: red caret flash on the HUD + combo reset (never death). Esc clears lock.
- Waves: spawn count/speed/word-length tier scale with wave number; starting speed seeded from the player's stored avg WPM for the language. Rubber-band: 5 flawless words → +10% speed; 2 leaks → −10%.
- 3 lives; leaked ship = −1 life. Score = `wordLength × 10 × comboMult` (combo +0.5× per flawless word, reset on error); wave-clear bonus × accuracy.
- Engine: one `<canvas>` + `useGameLoop` (rAF, delta-time), mutable state in a ref; React renders HUD only. **Devanagari words drawn as DOM overlays** positioned over the canvas (guaranteed conjunct shaping); ships/lasers/particles on canvas.
- End screen feeds the normal stats/XP pipeline (`mode:'game'`).

### Game 2 — Saathi Racer (DOM, ghost racing)
- 3 lanes: you, "Rival" bot, Ghost (your best run on this passage, if any). Type a passage (English sentences / Nepali sentences & proverbs); your runner advances per correct word.
- Bot WPM = your rolling average +5%, with gaussian jitter and occasional 400ms stumbles — always beatable, always close.
- Ghost = replay of stored keystroke timeline `{t, charIndex}[]` from your PB run on that passage (localStorage, capped at 20 passages).
- 30–60s races; placement + WPM shown at the end; beating your ghost triggers Large celebration + "Ghost Buster" achievement.
- Pure DOM/CSS (lane progress = `transform: translateX`), trivial to keep 60fps.

---

## 7. Stats Engine

### Metrics (`engine/metrics.ts` — Monkeytype-exact)
```ts
wpm  = (correctWordChars + correctSpaces) * 60 / seconds / 5;
raw  = (allTypedChars) * 60 / seconds / 5;
accuracy = 100 * correct / (correct + incorrect);        // live-counted; backspace doesn't erase
cpm  = correctCodePoints * 60 / seconds;                  // shown for Nepali alongside WPM
kogasa = (cov) => 100 * (1 - Math.tanh(cov + cov**3/3 + cov**5/5));
consistency = kogasa(popStdDev(rawPerSecond) / mean(rawPerSecond));  // NaN → 0
```
- Per-second sampler pushes `{wpm, raw, errors, keypresses, afk}`; powers the results chart.
- Timer: `performance.now()` from first keystroke; ignore `event.repeat`; backspace counts as activity (AFK guard) but is never a scored keystroke.
- AFK: per-second afk flags; result invalid for PBs if last 5s all afk; untimed lesson mode clamps inter-key gaps >5s out of the denominator.
- Per-key: for each expected char log `{hits, misses, totalLatencyMs, timedCount}`; discard latencies <40ms or >12000ms; EMA α=0.1 across sessions. Nepali keys = roman keystrokes (deterministic), so the heatmap is a physical-keyboard heatmap in both languages.

### TS interfaces (`store/useStats.ts`)
```ts
type Lang = 'en' | 'ne';
type Mode = 'time' | 'words' | 'lesson' | 'game';

interface TestResult {
  id: string; ts: number; lang: Lang; mode: Mode; mode2: string;   // '60' | '25' | lessonId | gameId
  seconds: number; wpm: number; raw: number; cpm: number;
  acc: number; consistency: number;
  chars: { correct: number; incorrect: number; extra: number; missed: number; backspaces: number };
  chart: { wpm: number[]; raw: number[]; err: number[] };
  maxCombo: number; xp: number; isPb: boolean; afkInvalid: boolean;
}
interface KeyStat { hits: number; misses: number; emaLatency: number | null; best: number | null; }
interface PersonalBest { wpm: number; raw: number; acc: number; consistency: number; ts: number; }
interface DayAggregate { tests: number; timeSec: number; bestWpm: number; xp: number; }
interface StreakState { current: number; longest: number; lastActive: string; shields: number; }
```

### localStorage schema (zustand persist, versioned, migration-ready)
| Key | Contents |
|-----|----------|
| `ts.settings.v1` | theme, soundOn, volume, motionReduced, lang, caretStyle |
| `ts.progress.v1` | xp, level, streak: StreakState, achievements: Record<id,{unlockedAt,progress}>, lessons: Record<lessonId,{stars,bestAcc,passed}>, lifetimeKeys, dailyXp: Record<localDate, number> |
| `ts.stats.v1` | results: TestResult[] (ring buffer, newest 500), pbs: Record<`${lang}\|${mode}\|${mode2}`, PersonalBest>, keys: Record<`${lang}:${char}`, KeyStat>, days: Record<localDate, DayAggregate>, ghosts: Record<passageId, {t:number,i:number}[]> |

Settings screen has **Export JSON / Import JSON** (one blob of all three keys) — the only backup story on GitHub Pages, and it protects the streak users fear losing.

---

## 8. Theme System + UI Polish Checklist

### Themes (`data/themes.ts` + `index.css`)
~10 semantic tokens as CSS custom properties, swapped via `data-theme` on `<html>`:
`--bg --surface --text --sub --main --caret --error --success --xp(yellow) --streak(orange)`.

Six themes: **Danphe Dark** (default — deep navy, danphe teal accent), **Himal Light**, **Mitho Momo** (warm red/cream), **Sagarmatha** (ice blue), **Gruvbox**, **Terminal Green**.
Blocking inline `<head>` script reads `ts.settings.v1` → sets `data-theme` before paint (no flash). Live preview on hover in the settings picker.

### Polish checklist (each verified before ship)
- [ ] Caret: separate absolute element, `transform` via ref + rAF (cancel pending frame), ~90ms ease; degrades to instant under reduced motion
- [ ] Only ~3 grapheme spans re-render per keystroke (memoized `<Char>`); letter coloring never changes font weight (zero layout shift)
- [ ] Test starts on first keystroke; **Tab = instant restart**; Esc = reset; zero modals in the loop
- [ ] Focus mode: header/footer fade to 20% opacity while typing
- [ ] Nepali text area ≥28px in Noto Sans Devanagari (devanagari subset imported + preloaded, `font-display: swap`)
- [ ] Live transliteration preview large and centered; in-progress cluster shown as "pending", not error
- [ ] All animations 150–300ms, transform/opacity only; confetti `useWorker: true`
- [ ] `usePrefersReducedMotion` hook + in-app Motion/Sound toggles; 0.01ms CSS fallback for CSS-only anims
- [ ] Keyboard heatmap colors via theme tokens (red→green ramp, Laplace-smoothed by exposure)
- [ ] All asset/sound refs via `import.meta.env.BASE_URL` or imports (subpath-safe)
- [ ] Empty states (no stats yet, no ghost yet) designed, not blank
- [ ] Header: flame + streak count, level title, XP proximity text, daily ring — always visible

---

## 9. npm Dependencies (exact)

```jsonc
// dependencies
"react": "^19.2.7",
"react-dom": "^19.2.7",
"zustand": "^5.0.14",
"canvas-confetti": "^1.9.4",
"motion": "^12.40.0",
"@fontsource-variable/noto-sans-devanagari": "^5.2.8",

// devDependencies
"vite": "^8.0.16",
"@vitejs/plugin-react": "^6.0.2",
"typescript": "~5.9",
"tailwindcss": "^4.3.0",
"@tailwindcss/vite": "^4.3.0",
"gh-pages": "^6.3.0",
"@types/canvas-confetti": "^1.9.0",
"vitest": "^3"            // engine + metrics unit tests
```
**Deliberately omitted**: router (view state in store), recharts/chart.js (hand-rolled SVG chart, ~40 lines), howler (synthesized Web Audio), sanscript (own 200-line engine), idb (localStorage suffices), react-activity-calendar (hand-rolled CSS-grid calendar, ~60 lines).

`vite.config.ts`: `base: command === 'build' ? '/typeshala/' : '/'`; plugins `[react(), tailwindcss()]`.
Scripts: `"predeploy": "npm run build"`, `"deploy": "gh-pages -d dist"`. **No Claude/AI attribution in commits.**

---

## 10. Build Order (numbered implementation steps)

1. **Scaffold**: `npm create vite@latest . -- --template react-ts`; install deps; Tailwind v4 via `@tailwindcss/vite`; `@theme` tokens + 6 theme palettes in `index.css`; head theme script; `base` config; verify `npm run build`.
2. **Engine core**: `mapping.ts` + `transliterate.ts` + `graphemes.ts` + `metrics.ts`; vitest golden tests (transliteration pairs + kogasa/wpm fixtures). **Gate: all tests green.**
3. **Data**: `words.en.ts`, `words.ne.ts` (corpus tiers/sentences/proverbs verbatim from research), `lessons.en.ts`, `lessons.ne.ts`, `achievements.ts`, `themes.ts`. Precompute `dev` fields with the engine at module load (also acts as a runtime self-check).
4. **Stores**: `useSettings`, `useUI`, `useProgress`, `useStats` with zustand persist (versioned keys, migrate stubs).
5. **TypingCore**: hidden input + keydown capture (`engine/keystroke.ts`), grapheme span renderer, caret (ref+rAF), per-second sampler, English time/words test end-to-end with raw results object. **Gate: type a 15s English test, numbers look sane.**
6. **Nepali mode**: roman-sequence grading + `DevanagariPreview`; wire language toggle; verify नमस्ते flows.
7. **Results pipeline**: `ResultsCard` + SVG `WpmChart` (wpm line, raw line, error ×s); save `TestResult`, PB detection, per-key + day aggregates.
8. **Gamification**: `gamification.ts` (XP/levels/streak/shields/combo/achievement checks) + `celebrate.ts` + `sounds.ts` + `CelebrationLayer` (confetti + toast queue) + `ComboCounter` + header (flame, XP bar, daily ring). **Gate: finish a drill → XP count-up, PB → confetti + fanfare.**
9. **Lessons**: `LessonGrid` (units, stars, lock-until-previous-passed), `LessonPlayer` (TypingCore + hints + accuracy gate + star award), both curricula playable.
10. **Stats view**: PBCards, Sparkline, KeyHeatmap (virtual keyboard, red→green), ActivityCalendar (CSS grid, quantile levels), HistoryList, JSON export/import.
11. **Khukuri Strike**: `useGameLoop`, canvas ships/lasers/particles + DOM word overlays, lock/shoot/combo/waves/rubber-band, score → XP pipeline + achievement.
12. **Saathi Racer**: passage picker, bot logic, ghost record/replay, lanes UI, placement → XP + Ghost Buster.
13. **Settings + a11y pass**: theme picker (live preview), sound volume, motion toggle, export/import; sweep `prefers-reduced-motion`; empty states; focus mode.
14. **Polish + QA sweep**: run the §8 checklist; play every lesson unit head, both games, break a streak in devtools (shield fires), import/export round-trip.
15. **Deploy**: `npm run build` → preview locally with subpath → `npm run deploy` → verify at `https://<user>.github.io/typeshala/` (fonts, sounds, persistence). Tag v0.1.0.

**Future (post-MVP, documented only)**: Traditional/Remington + Preeti-simulation layouts (nepalify keymaps), Lok Sewa exam mode + canvas certificate, PWA via vite-plugin-pwa, adaptive Keybr-style track, daily quests + bonus chest, mobile IME input-event path, shareable PNG result cards.
