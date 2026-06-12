// Grapheme-cluster helpers — never index Devanagari by code unit.

let segmenter: Intl.Segmenter | null = null
function seg(): Intl.Segmenter | null {
  if (segmenter) return segmenter
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    segmenter = new Intl.Segmenter('ne', { granularity: 'grapheme' })
  }
  return segmenter
}

/** Split a string into grapheme clusters (matras stay attached to their consonant). */
export function graphemes(s: string): string[] {
  const sg = seg()
  if (!sg) return Array.from(s) // fallback: code points
  return Array.from(sg.segment(s), (x) => x.segment)
}

export function normalize(s: string): string {
  return s.normalize('NFC')
}
