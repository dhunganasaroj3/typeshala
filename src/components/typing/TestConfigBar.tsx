import type { Lang } from '../../types'
import { useSettings } from '../../store/useSettings'

export type TestMode = 'time' | 'words'

export interface TestConfig {
  mode: TestMode
  /** seconds for time mode, word count for words mode */
  amount: number
}

const TIME_CHIPS = [15, 30, 60]
const WORD_CHIPS = [10, 25, 50]

interface Props {
  config: TestConfig
  onChange: (c: TestConfig) => void
  /** dims when a drill is in progress */
  dimmed?: boolean
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-sm transition-colors tabular-nums ${
        active ? 'text-main' : 'text-sub hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

export default function TestConfigBar({ config, onChange, dimmed }: Props) {
  const lang = useSettings((s) => s.lang)
  const setLang = useSettings((s) => s.setLang)

  const chips = config.mode === 'time' ? TIME_CHIPS : WORD_CHIPS

  const setMode = (mode: TestMode) => {
    const defaults = mode === 'time' ? 30 : 25
    onChange({ mode, amount: defaults })
  }

  const langs: Array<{ id: Lang; label: string }> = [
    { id: 'en', label: 'EN' },
    { id: 'ne', label: 'ने' },
  ]

  return (
    <div
      className={`flex items-center justify-center gap-4 rounded-lg bg-surface/60 px-3 py-1.5 text-sm transition-opacity ${
        dimmed ? 'focus-dim' : ''
      }`}
    >
      {/* language */}
      <div className="flex items-center gap-1">
        {langs.map((l) => (
          <Chip key={l.id} active={lang === l.id} onClick={() => setLang(l.id)}>
            <span className={l.id === 'ne' ? 'font-devanagari' : ''}>{l.label}</span>
          </Chip>
        ))}
      </div>

      <span className="text-surface select-none">|</span>

      {/* mode */}
      <div className="flex items-center gap-1">
        <Chip active={config.mode === 'time'} onClick={() => setMode('time')}>
          time
        </Chip>
        <Chip active={config.mode === 'words'} onClick={() => setMode('words')}>
          words
        </Chip>
      </div>

      <span className="text-surface select-none">|</span>

      {/* amount */}
      <div className="flex items-center gap-1">
        {chips.map((c) => (
          <Chip key={c} active={config.amount === c} onClick={() => onChange({ ...config, amount: c })}>
            {c}
          </Chip>
        ))}
      </div>
    </div>
  )
}
