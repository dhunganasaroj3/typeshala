import type { CelebrationTier } from '../types'
import { useUI } from '../store/useUI'

const TIER_STYLE: Record<CelebrationTier, string> = {
  small: 'border-surface text-text',
  medium: 'border-main/60 text-text',
  large: 'border-xp/70 text-text',
  epic: 'border-streak/80 text-text',
}

const TIER_ACCENT: Record<CelebrationTier, string> = {
  small: 'text-sub',
  medium: 'text-main',
  large: 'text-xp',
  epic: 'text-streak',
}

export default function CelebrationLayer() {
  const toasts = useUI((s) => s.toasts)
  const dismissToast = useUI((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          style={{ animation: 'ts-slide-in 260ms cubic-bezier(0.16,1,0.3,1)' }}
          className={`pointer-events-auto text-left w-full flex items-start gap-3 rounded-lg border bg-surface/95 backdrop-blur px-3 py-2.5 shadow-lg ${
            TIER_STYLE[t.tier]
          } ${t.tier === 'epic' ? 'ring-2 ring-streak/40' : ''}`}
        >
          <span className="text-2xl leading-none shrink-0">{t.icon}</span>
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className={`text-sm font-semibold leading-tight ${TIER_ACCENT[t.tier]}`}>{t.title}</span>
            {t.body && <span className="text-xs text-sub leading-snug">{t.body}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
