# टाइपशाला · TypeShala

A free, **client-only**, heavily gamified typing tutor for **English** and **Nepali** (romanized phonetic input) — runs entirely in your browser, no backend, no accounts.

🔗 **Live:** https://dhunganasaroj3.github.io/typeshala/

## Features

- **Typing test** (Monkeytype-style): time (15/30/60s) and words (10/25/50) modes, smooth animated caret, per-character coloring, live WPM, a results card with WPM / Raw / Accuracy / Consistency and a per-second SVG chart.
- **Nepali phonetic engine**: a rule-based Roman → Devanagari transliterator (`kasto` → कस्तो, `namaste` → नमस्ते, `garchhu` → गर्छु). You type roman; Devanagari renders live. Conjuncts (क्ष ज्ञ त्र), matras, halanta, anusvara, and Devanagari numerals all supported.
- **Lessons**: 20 English + 20 Nepali lessons, from home row / bare consonants up through conjuncts, sentences, and proverbs. 95% accuracy gate, 1–3 stars, fading hints.
- **Gamification**: XP (mastery-weighted), levels with Nepali titles (सिकारु → सगरमाथा), daily streaks with grace + streak shields, combo counter, **16 achievements**, tiered celebrations (sound + confetti).
- **Games**:
  - **Khukuri Strike** — a ZType-style canvas shooter; type the words on falling ships to destroy them.
  - **Saathi Racer** — race a rival bot and the ghost of your own best run.
- **Stats**: personal bests, WPM trend, per-key error heatmap on a virtual keyboard, a GitHub-style activity calendar, and JSON export/import.
- **6 themes**, synthesized Web Audio sound (no asset files), full `prefers-reduced-motion` support.

Everything persists in `localStorage`.

## Tech

React 19 · Vite 8 · TypeScript · Tailwind v4 · zustand · canvas-confetti. The transliteration engine and stats metrics are hand-rolled and unit-tested with Vitest.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + component tests
npm run build      # production build to dist/
npm run deploy     # build + publish dist/ to the gh-pages branch
```

## Romanization quick reference

| Type | … | Notes |
|------|---|-------|
| Consonants | `k kh g gh` … | capitals `T Th D Dh N` = retroflex (टठडढण) |
| Vowels / matras | `a aa i ii u uu e ai o au` | inherent `a`; `aa`→ा etc. |
| Conjuncts | join consonants | `s`+`t` → स्त; `ksh`→क्ष, `gy`→ज्ञ |
| Signs | `M`/`*`→ं, `~`→ँ, `H`→ः | `.`→। (danda) |
| Numerals | `0`–`9` → ०–९ | |
