import type { Lang } from '../../types'
import { useAdaptive } from '../../store/useAdaptive'
import { cpmToWpm } from '../../adaptive/constants'
import LearningGraph from './LearningGraph'
import PerKeyTable from './PerKeyTable'

interface ProfileViewProps {
  lang: Lang
}

/**
 * Analytics page for the adaptive trainer: learning curve, per-key breakdown,
 * and a target-progress summary (current best average WPM vs target).
 */
export default function ProfileView({ lang }: ProfileViewProps) {
  const state = useAdaptive((s) => s.byLang[lang])
  const targetCpm = useAdaptive((s) => s.settings.targetCpm)

  const keys = Object.values(state.keys)
  const bestWpms = keys
    .map((k) => k.bestTimeToType)
    .filter((ms): ms is number => ms != null && ms > 0)
    .map((ms) => cpmToWpm(60000 / ms))

  const avgBestWpm = bestWpms.length > 0 ? bestWpms.reduce((a, b) => a + b, 0) / bestWpms.length : 0
  const targetWpm = cpmToWpm(targetCpm)
  const progress = targetWpm > 0 ? Math.min(1, avgBestWpm / targetWpm) : 0

  const calibratedCount = keys.filter((k) => k.emaTimeToType != null).length

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-text">
          Profile — {lang === 'en' ? 'English' : 'Nepali'}
        </h2>
        <span className="text-sm text-sub">
          {state.lessonCount} lesson{state.lessonCount === 1 ? '' : 's'} · {calibratedCount} keys
          learned
        </span>
      </header>

      {/* Target progress */}
      <section className="rounded-md bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-text">Target progress</span>
          <span className="text-sub">
            <span className="text-main">{avgBestWpm.toFixed(0)}</span> / {targetWpm.toFixed(0)} wpm
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-main transition-all"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          />
        </div>
        {bestWpms.length === 0 && (
          <p className="mt-2 text-xs text-sub">Type a few lessons to start tracking progress.</p>
        )}
      </section>

      {/* Learning curve */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-sub">
          Learning curve
        </h3>
        <LearningGraph state={state} />
      </section>

      {/* Per-key table */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-sub">
          Per-key breakdown
        </h3>
        <PerKeyTable state={state} lang={lang} targetCpm={targetCpm} />
      </section>
    </div>
  )
}
