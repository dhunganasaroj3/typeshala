import { useStats } from '../../store/useStats'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

const MODE_LABEL: Record<string, string> = {
  time: 'Time',
  words: 'Words',
  lesson: 'Lesson',
  game: 'Game',
}

export default function HistoryList({ limit = 20 }: { limit?: number }) {
  const results = useStats((s) => s.results)
  const recent = results.slice(0, limit)

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Recent results
      </h3>
      {recent.length === 0 ? (
        <div className="text-xs text-sub">No results yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface text-xs uppercase tracking-wider text-sub">
                <th className="py-2 pr-3 font-medium">Mode</th>
                <th className="py-2 pr-3 font-medium">Lang</th>
                <th className="py-2 pr-3 text-right font-medium">WPM</th>
                <th className="py-2 pr-3 text-right font-medium">Acc</th>
                <th className="py-2 pr-3 text-right font-medium">Con</th>
                <th className="py-2 pr-3 text-right font-medium">XP</th>
                <th className="py-2 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-surface/40 text-text">
                  <td className="py-2 pr-3">
                    {MODE_LABEL[r.mode] ?? r.mode}
                    <span className="ml-1 text-xs text-sub">{r.mode2}</span>
                    {r.isPb && <span className="ml-1 text-xs text-xp">PB</span>}
                  </td>
                  <td className="py-2 pr-3 uppercase text-sub">{r.lang}</td>
                  <td className="py-2 pr-3 text-right font-medium text-main">
                    {Math.round(r.wpm)}
                  </td>
                  <td className="py-2 pr-3 text-right">{r.acc.toFixed(0)}%</td>
                  <td className="py-2 pr-3 text-right text-sub">
                    {Math.round(r.consistency)}%
                  </td>
                  <td className="py-2 pr-3 text-right text-xp">+{r.xp}</td>
                  <td className="py-2 text-right text-xs text-sub">{relativeTime(r.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
