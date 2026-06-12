import { useState } from 'react'
import GamePicker, { type GameId } from './GamePicker'
import KhukuriStrike from './KhukuriStrike'
import SaathiRacer from './SaathiRacer'

export default function GamesView() {
  const [active, setActive] = useState<GameId | null>(null)

  if (!active) return <GamePicker onPick={setActive} />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button
        onClick={() => setActive(null)}
        className="mb-4 rounded-lg border border-surface px-3 py-1.5 text-sm text-sub transition hover:text-main"
      >
        ← Back to games
      </button>
      {active === 'khukuri-strike' ? <KhukuriStrike /> : <SaathiRacer />}
    </div>
  )
}
