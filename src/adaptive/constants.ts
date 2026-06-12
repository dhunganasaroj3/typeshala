// Tunables for the Keybr-style adaptive engine. All numbers locked per ADAPTIVE_PLAN.md.

export const EMA_ALPHA = 0.1
export const DEFAULT_TARGET_CPM = 175 // 35 WPM
export const MIN_TARGET_CPM = 75
export const MAX_TARGET_CPM = 750
export const MIN_ALPHABET = 6 // seed size
export const SAMPLE_MIN_MS = 40 // discard < 40ms/char (held/debounce)
export const SAMPLE_MAX_MS = 12000 // discard > 12s/char (AFK)
export const MIN_KEYS_PER_LESSON = 3 // a lesson needs >=3 distinct tokens to be valid
export const WORD_MIN_LEN = 3
export const WORD_MAX_LEN = 10
export const SPACE_BOOST_BASE = 1.3 // space freq *= 1.3^wordLen
export const WORD_RETRIES = 6
export const MARKOV_ORDER = 3 // context = previous 2 tokens
export const SAMPLE_CAP = 60 // per-key sample history cap
export const DEFAULT_WORDS_PER_LESSON = 18

export const speedToTime = (cpm: number) => 60000 / cpm // ms per char
export const cpmToWpm = (cpm: number) => cpm / 5
export const wpmToCpm = (wpm: number) => wpm * 5
