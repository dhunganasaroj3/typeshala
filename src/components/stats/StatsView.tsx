import { useMemo, useRef } from 'react'
import { useSettings } from '../../store/useSettings'
import { useStats } from '../../store/useStats'
import { useProgress } from '../../store/useProgress'
import PBCards from './PBCards'
import Sparkline from './Sparkline'
import KeyHeatmap from './KeyHeatmap'
import ActivityCalendar from './ActivityCalendar'
import HistoryList from './HistoryList'

const TS_KEYS = ['ts.settings.v1', 'ts.progress.v1', 'ts.stats.v1']

export function exportData(): string {
  const blob: Record<string, unknown> = {}
  for (const k of TS_KEYS) {
    const v = localStorage.getItem(k)
    if (v != null) {
      try {
        blob[k] = JSON.parse(v)
      } catch {
        blob[k] = v
      }
    }
  }
  return JSON.stringify({ app: 'typeshala', version: 1, data: blob }, null, 2)
}

/** Parse + apply an exported blob. Calls importAll on the stores and reloads. */
export function importData(json: string): void {
  const parsed = JSON.parse(json)
  const data = parsed?.data ?? parsed
  for (const k of TS_KEYS) {
    if (data[k] != null) {
      localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]))
    }
  }

  // Push parsed slices into live stores so importAll runs (also triggers persist).
  const stats = data['ts.stats.v1']?.state ?? data['ts.stats.v1']
  if (stats) {
    useStats.getState().importAll({
      results: stats.results ?? [],
      pbs: stats.pbs ?? {},
      keys: stats.keys ?? {},
      days: stats.days ?? {},
      ghosts: stats.ghosts ?? {},
    })
  }
  const prog = data['ts.progress.v1']?.state ?? data['ts.progress.v1']
  if (prog) {
    useProgress.getState().importAll(prog)
  }

  // Reload to re-hydrate settings (theme/sound) cleanly.
  window.location.reload()
}

export function downloadExport(): void {
  const json = exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `typeshala-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function StatsView() {
  const lang = useSettings((s) => s.lang)
  const results = useStats((s) => s.results)
  const fileRef = useRef<HTMLInputElement>(null)

  const trend = useMemo(() => {
    // oldest -> newest WPM for this language's last ~30 timed/word results
    return results
      .filter((r) => r.lang === lang && (r.mode === 'time' || r.mode === 'words'))
      .slice(0, 30)
      .map((r) => r.wpm)
      .reverse()
  }, [results, lang])

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

  const empty = results.length === 0

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Stats</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadExport}
            className="rounded-md bg-surface px-3 py-1.5 text-sm text-text hover:bg-main hover:text-bg"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-surface px-3 py-1.5 text-sm text-text hover:bg-main hover:text-bg"
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
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed border-surface p-10 text-center text-sub">
          No stats yet. Complete a typing test to see your progress here.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <PBCards />

          <div className="rounded-lg border border-surface bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
              WPM trend ({lang === 'en' ? 'English' : 'Nepali'})
            </h3>
            <Sparkline values={trend} />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-surface bg-surface p-4">
              <KeyHeatmap />
            </div>
            <div className="rounded-lg border border-surface bg-surface p-4">
              <ActivityCalendar />
            </div>
          </div>

          <div className="rounded-lg border border-surface bg-surface p-4">
            <HistoryList />
          </div>
        </div>
      )}
    </div>
  )
}
