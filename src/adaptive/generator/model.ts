// Markov model shape shared by the build script and the runtime generator.

export const PAD = '^' // word start/end sentinel
export const SEP = '|' // context join separator (unambiguous for multi-char NE tokens)

/** context(2 tokens joined by SEP) -> token -> count */
export type MarkovModel = Record<string, Record<string, number>>

export interface LangModel {
  lang: 'en' | 'ne'
  order: number // 3
  tokens: string[] // alphabet, descending frequency (drives unlock order)
  model: MarkovModel
  words: string[] // top words for optional "natural words" mode
}
