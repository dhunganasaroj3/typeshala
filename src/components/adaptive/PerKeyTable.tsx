import { useState } from 'react'
import type { Lang } from '../../types'
import type { KeyState, LangAdaptiveState } from '../../adaptive/types'
import { cpmToWpm } from '../../adaptive/constants'
import { confidence } from '../../adaptive/confidence'
import { toDevanagari } from '../../engine/transliterate'

interface PerKeyTableProps {
  state: LangAdaptiveState
  lang: Lang
  targetCpm: number
}

type SortKey = 'token' | 'wpm' | 'confidence' | 'hits' | 'misses' | 'best'

interface Row {
  token: string
  wpm: number | null
  confidence: number | null
  best: number | null
  hits: number
  misses: number
}

function msToWpm(ms: number | null): number | null {
  if (ms == null || ms <= 0) return null
  return cpmToWpm(60000 / ms)
}

function rowFromKey(k: KeyState, targetCpm: number): Row {
  return {
    token: k.token,
    wpm: msToWpm(k.emaTimeToType),
    confidence: confidence(k.emaTimeToType, targetCpm),
    best: msToWpm(k.bestTimeToType),
    hits: k.totalHits,
    misses: k.totalMisses,
  }
}

export default function PerKeyTable({ state, lang, targetCpm }: PerKeyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('confidence')
  const [asc, setAsc] = useState(true)

  const rows = Object.values(state.keys).map((k) => rowFromKey(k, targetCpm))

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md bg-surface py-6 text-sm text-sub">
        No key data yet — start typing to populate your profile
      </div>
    )
  }

  const sorted = [...rows].sort((a, b) => {
    let av: number | string
    let bv: number | string
    if (sortKey === 'token') {
      av = a.token
      bv = b.token
    } else {
      av = (a[sortKey] ?? -1) as number
      bv = (b[sortKey] ?? -1) as number
    }
    if (av < bv) return asc ? -1 : 1
    if (av > bv) return asc ? 1 : -1
    return 0
  })

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v)
    else {
      setSortKey(key)
      setAsc(key === 'token')
    }
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: 'token', label: 'Key' },
    { key: 'wpm', label: 'WPM' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'hits', label: 'Hits' },
    { key: 'misses', label: 'Misses' },
    { key: 'best', label: 'Best' },
  ]

  return (
    <div className="overflow-x-auto rounded-md bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface text-left text-xs uppercase tracking-wider text-sub">
            {headers.map((h) => (
              <th
                key={h.key}
                onClick={() => toggle(h.key)}
                className="cursor-pointer select-none px-3 py-2 font-semibold hover:text-text"
              >
                {h.label}
                {sortKey === h.key ? (asc ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.token} className="border-b border-surface/50 last:border-0">
              <td className="px-3 py-1.5 font-medium text-text">
                <span>{r.token}</span>
                {lang === 'ne' && (
                  <span className="font-devanagari ml-2 text-sub">{toDevanagari(r.token)}</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-sub">{r.wpm != null ? r.wpm.toFixed(0) : '—'}</td>
              <td className="px-3 py-1.5 text-sub">
                {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}
              </td>
              <td className="px-3 py-1.5 text-success">{r.hits}</td>
              <td className="px-3 py-1.5 text-error">{r.misses}</td>
              <td className="px-3 py-1.5 text-sub">{r.best != null ? r.best.toFixed(0) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
