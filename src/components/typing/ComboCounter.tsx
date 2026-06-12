import { memo } from 'react'
import { comboTier } from '../../game/gamification'

export interface ComboCounterProps {
  combo: number
}

/**
 * Small combo indicator that fades in once the user reaches 10+ consecutive
 * correct keystrokes. Shows a tier label (from gamification.comboTier) at
 * milestone thresholds.
 */
function ComboCounterImpl({ combo }: ComboCounterProps) {
  const visible = combo >= 10
  const tier = comboTier(combo)

  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none flex flex-col items-center transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span className="text-xp text-lg font-bold tabular-nums">{combo}x</span>
      {tier && <span className="text-streak text-xs font-semibold tracking-wide">{tier}</span>}
    </div>
  )
}

const ComboCounter = memo(ComboCounterImpl)
ComboCounter.displayName = 'ComboCounter'
export default ComboCounter
