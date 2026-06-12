// Typing performance metrics (Monkeytype-compatible formulas).

export function wpm(correctChars: number, seconds: number): number {
  if (seconds <= 0) return 0
  return (correctChars * 60) / seconds / 5
}

export function rawWpm(allTypedChars: number, seconds: number): number {
  if (seconds <= 0) return 0
  return (allTypedChars * 60) / seconds / 5
}

export function cpm(correctCodePoints: number, seconds: number): number {
  if (seconds <= 0) return 0
  return (correctCodePoints * 60) / seconds
}

/** Accuracy as a percentage 0..100. */
export function accuracy(correct: number, incorrect: number): number {
  const total = correct + incorrect
  if (total === 0) return 100
  return (100 * correct) / total
}

/** Monkeytype "kogasa" mapping of a coefficient of variation to a 0..100 score. */
export function kogasa(cov: number): number {
  return 100 * (1 - Math.tanh(cov + cov ** 3 / 3 + cov ** 5 / 5))
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function popStdDev(xs: number[]): number {
  if (xs.length === 0) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/** Consistency 0..100 from the per-second raw WPM samples. */
export function consistency(rawPerSecond: number[]): number {
  const m = mean(rawPerSecond)
  if (m === 0) return 0
  const cov = popStdDev(rawPerSecond) / m
  const c = kogasa(cov)
  return Number.isFinite(c) ? c : 0
}
