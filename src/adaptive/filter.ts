import { EMA_ALPHA } from './constants'

/** Exponential moving average. First sample is raw. */
export function ema(prev: number | null, sample: number, alpha = EMA_ALPHA): number {
  return prev == null ? sample : prev + alpha * (sample - prev)
}
