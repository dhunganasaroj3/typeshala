import type { Lang } from '../../types'
import { useSettings } from '../../store/useSettings'
import { useStats, pbKey } from '../../store/useStats'

interface PBSpec {
  mode: string
  mode2: string
  label: string
}

const TIME_SPECS: PBSpec[] = [
  { mode: 'time', mode2: '15', label: 'Time 15s' },
  { mode: 'time', mode2: '30', label: 'Time 30s' },
  { mode: 'time', mode2: '60', label: 'Time 60s' },
]
const WORD_SPECS: PBSpec[] = [
  { mode: 'words', mode2: '10', label: 'Words 10' },
  { mode: 'words', mode2: '25', label: 'Words 25' },
  { mode: 'words', mode2: '50', label: 'Words 50' },
]

function PBCard({ lang, spec }: { lang: Lang; spec: PBSpec }) {
  const pb = useStats((s) => s.pbs[pbKey(lang, spec.mode, spec.mode2)])
  return (
    <div className="rounded-lg border border-surface bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-sub">{spec.label}</div>
      {pb ? (
        <>
          <div className="mt-1 text-3xl font-bold text-main">{Math.round(pb.wpm)}</div>
          <div className="text-xs text-sub">
            wpm · {pb.acc.toFixed(0)}% acc · {Math.round(pb.consistency)}% con
          </div>
        </>
      ) : (
        <div className="mt-1 text-2xl font-bold text-sub opacity-50">—</div>
      )}
    </div>
  )
}

export default function PBCards() {
  const lang = useSettings((s) => s.lang)
  const specs = [...TIME_SPECS, ...WORD_SPECS]
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Personal Bests ({lang === 'en' ? 'English' : 'Nepali'})
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {specs.map((spec) => (
          <PBCard key={`${spec.mode}-${spec.mode2}`} lang={lang} spec={spec} />
        ))}
      </div>
    </div>
  )
}
