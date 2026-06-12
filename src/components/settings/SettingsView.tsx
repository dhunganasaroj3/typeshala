import { useRef } from 'react'
import type { Lang } from '../../types'
import { useSettings } from '../../store/useSettings'
import { useAdaptive } from '../../store/useAdaptive'
import { THEMES } from '../../data/themes'
import { downloadExport, importData } from '../stats/StatsView'
import {
  MIN_TARGET_CPM,
  MAX_TARGET_CPM,
  cpmToWpm,
  wpmToCpm,
} from '../../adaptive/constants'

function ThemeSwatch({
  id,
  name,
  active,
  onSelect,
}: {
  id: string
  name: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-theme={id}
      className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${
        active ? 'border-main' : 'border-surface hover:border-sub'
      }`}
    >
      <div className="flex gap-1.5">
        <span className="h-5 w-5 rounded-full bg-bg ring-1 ring-surface" />
        <span className="h-5 w-5 rounded-full bg-main" />
        <span className="h-5 w-5 rounded-full bg-xp" />
        <span className="h-5 w-5 rounded-full bg-streak" />
        <span className="h-5 w-5 rounded-full bg-error" />
      </div>
      <span className="text-sm font-medium text-text">{name}</span>
      {active && <span className="text-xs text-main">Active</span>}
    </button>
  )
}

export default function SettingsView() {
  const theme = useSettings((s) => s.theme)
  const setTheme = useSettings((s) => s.setTheme)
  const soundOn = useSettings((s) => s.soundOn)
  const setSoundOn = useSettings((s) => s.setSoundOn)
  const volume = useSettings((s) => s.volume)
  const setVolumeLevel = useSettings((s) => s.setVolumeLevel)
  const motionReduced = useSettings((s) => s.motionReduced)
  const setMotionReduced = useSettings((s) => s.setMotionReduced)
  const lang = useSettings((s) => s.lang)
  const setLang = useSettings((s) => s.setLang)

  const adaptive = useAdaptive((s) => s.settings)
  const setAdaptive = useAdaptive((s) => s.setSettings)
  const resetLang = useAdaptive((s) => s.resetLang)

  const fileRef = useRef<HTMLInputElement>(null)

  const wpmMin = Math.round(cpmToWpm(MIN_TARGET_CPM))
  const wpmMax = Math.round(cpmToWpm(MAX_TARGET_CPM))
  const targetWpm = Math.round(cpmToWpm(adaptive.targetCpm))

  const onResetAdaptive = () => {
    // eslint-disable-next-line no-alert
    const ok = confirm(
      `Reset all adaptive trainer progress for ${lang === 'en' ? 'English' : 'Nepali'}? This cannot be undone.`,
    )
    if (ok) resetLang(lang)
  }

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importData(String(reader.result))
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert('Import failed: ' + (err as Error).message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-text">Settings</h1>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">Theme</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <ThemeSwatch
              key={t.id}
              id={t.id}
              name={t.name}
              active={theme === t.id}
              onSelect={() => {
                document.documentElement.dataset.theme = t.id
                setTheme(t.id)
              }}
            />
          ))}
        </div>
      </section>

      {/* Sound */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">Sound</h2>
        <label className="mb-4 flex items-center justify-between rounded-lg bg-surface p-3">
          <span className="text-text">Sound effects</span>
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => setSoundOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--main)]"
          />
        </label>
        <div className="rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span>Volume</span>
            <span className="text-sm text-sub">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            disabled={!soundOn}
            onChange={(e) => setVolumeLevel(Number(e.target.value))}
            className="w-full accent-[var(--main)]"
          />
        </div>
      </section>

      {/* Motion */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">Motion</h2>
        <label className="flex items-center justify-between rounded-lg bg-surface p-3">
          <span className="text-text">Reduce motion (disable confetti & animations)</span>
          <input
            type="checkbox"
            checked={motionReduced}
            onChange={(e) => setMotionReduced(e.target.checked)}
            className="h-5 w-5 accent-[var(--main)]"
          />
        </label>
      </section>

      {/* Language */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
          Default language
        </h2>
        <div className="flex gap-2">
          {(['en', 'ne'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                lang === l ? 'bg-main text-bg' : 'bg-surface text-sub hover:text-text'
              }`}
            >
              {l === 'en' ? 'English' : <span className="font-devanagari">नेपाली</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Adaptive Trainer */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
          Adaptive Trainer
        </h2>

        {/* Lesson content: Generated <-> Words */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 text-text">Lesson content</div>
          <div className="flex gap-2">
            {(
              [
                { label: 'Generated', val: false },
                { label: 'Words', val: true },
              ] as const
            ).map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAdaptive({ naturalWords: opt.val })}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  adaptive.naturalWords === opt.val
                    ? 'bg-main text-bg'
                    : 'bg-bg text-sub hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-sub">
            {adaptive.naturalWords
              ? 'Drill using real dictionary words.'
              : 'Drill using procedurally generated pseudo-words.'}
          </p>
        </div>

        {/* Speed unit: WPM <-> CPM */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 text-text">Speed unit</div>
          <div className="flex gap-2">
            {(['wpm', 'cpm'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setAdaptive({ unit: u })}
                className={`rounded-md px-4 py-2 text-sm font-medium uppercase transition-colors ${
                  adaptive.unit === u ? 'bg-main text-bg' : 'bg-bg text-sub hover:text-text'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Target speed (shown WPM, stored CPM) */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span>Target speed</span>
            <span className="text-sm text-sub">
              {adaptive.unit === 'cpm'
                ? `${Math.round(adaptive.targetCpm)} CPM`
                : `${targetWpm} WPM`}
            </span>
          </div>
          <input
            type="range"
            min={wpmMin}
            max={wpmMax}
            step={1}
            value={targetWpm}
            onChange={(e) => setAdaptive({ targetCpm: wpmToCpm(Number(e.target.value)) })}
            className="w-full accent-[var(--main)]"
          />
          <div className="mt-1 flex justify-between text-xs text-sub">
            <span>{wpmMin} WPM</span>
            <span>{wpmMax} WPM</span>
          </div>
        </div>

        {/* Run length */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span>Run length</span>
            <span className="text-sm text-sub">{adaptive.wordsPerLesson} words</span>
          </div>
          <input
            type="range"
            min={8}
            max={30}
            step={1}
            value={adaptive.wordsPerLesson}
            onChange={(e) => setAdaptive({ wordsPerLesson: Number(e.target.value) })}
            className="w-full accent-[var(--main)]"
          />
        </div>

        {/* Alphabet size */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span>Alphabet size</span>
            <span className="text-sm text-sub">{Math.round(adaptive.alphabetSize * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={adaptive.alphabetSize}
            onChange={(e) => setAdaptive({ alphabetSize: Number(e.target.value) })}
            className="w-full accent-[var(--main)]"
          />
          <p className="mt-1 text-xs text-sub">
            Force-include more keys before they are mastered.
          </p>
        </div>

        {/* Capitals (EN only) */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span className={lang === 'ne' ? 'text-sub' : undefined}>Capitals</span>
            <span className="text-sm text-sub">{Math.round(adaptive.pCapitals * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={adaptive.pCapitals}
            disabled={lang === 'ne'}
            onChange={(e) => setAdaptive({ pCapitals: Number(e.target.value) })}
            className="w-full accent-[var(--main)] disabled:opacity-40"
          />
          {lang === 'ne' && (
            <p className="mt-1 text-xs text-sub">Not available for Nepali.</p>
          )}
        </div>

        {/* Punctuation */}
        <div className="mb-4 rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span>Punctuation</span>
            <span className="text-sm text-sub">{Math.round(adaptive.pPunct * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={adaptive.pPunct}
            onChange={(e) => setAdaptive({ pPunct: Number(e.target.value) })}
            className="w-full accent-[var(--main)]"
          />
        </div>

        {/* Recover mode */}
        <label className="mb-4 flex items-center justify-between rounded-lg bg-surface p-3">
          <span className="text-text">
            Recover mode
            <span className="block text-xs text-sub">Stricter unlocking; revisit weak keys.</span>
          </span>
          <input
            type="checkbox"
            checked={adaptive.recover}
            onChange={(e) => setAdaptive({ recover: e.target.checked })}
            className="h-5 w-5 accent-[var(--main)]"
          />
        </label>

        {/* Keyboard display: finger zones */}
        <label className="mb-4 flex items-center justify-between rounded-lg bg-surface p-3">
          <span className="text-text">Show finger zones</span>
          <input
            type="checkbox"
            checked={adaptive.showZones}
            onChange={(e) => setAdaptive({ showZones: e.target.checked })}
            className="h-5 w-5 accent-[var(--main)]"
          />
        </label>

        {/* Keyboard display: highlight next key */}
        <label className="mb-4 flex items-center justify-between rounded-lg bg-surface p-3">
          <span className="text-text">Highlight next key</span>
          <input
            type="checkbox"
            checked={adaptive.highlightNextKey}
            onChange={(e) => setAdaptive({ highlightNextKey: e.target.checked })}
            className="h-5 w-5 accent-[var(--main)]"
          />
        </label>

        {/* Reset adaptive progress (per language) */}
        <div className="rounded-lg bg-surface p-3">
          <div className="mb-2 flex items-center justify-between text-text">
            <span>Reset adaptive progress</span>
            <span className="text-sm text-sub">
              {lang === 'en' ? 'English' : <span className="font-devanagari">नेपाली</span>}
            </span>
          </div>
          <button
            type="button"
            onClick={onResetAdaptive}
            className="rounded-md bg-bg px-4 py-2 text-sm text-error hover:bg-error hover:text-bg"
          >
            Reset {lang === 'en' ? 'English' : 'Nepali'} progress
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
          Data backup
        </h2>
        <p className="mb-3 text-sm text-sub">
          Everything is stored locally in your browser. Export a backup to protect your streak and
          stats.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadExport}
            className="rounded-md bg-surface px-4 py-2 text-sm text-text hover:bg-main hover:text-bg"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-surface px-4 py-2 text-sm text-text hover:bg-main hover:text-bg"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </section>
    </div>
  )
}
