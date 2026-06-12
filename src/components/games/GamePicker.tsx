import { useProgress } from '../../store/useProgress'

export type GameId = 'khukuri-strike' | 'saathi-racer'

interface GamePickerProps {
  onPick: (id: GameId) => void
}

const GAMES: Array<{ id: GameId; title: string; ne: string; desc: string; icon: string }> = [
  {
    id: 'khukuri-strike',
    title: 'Khukuri Strike',
    ne: 'खुकुरी स्ट्राइक',
    desc: 'Type the falling words to blast incoming ships. Lock a target, fire with every correct key, keep your combo alive across waves.',
    icon: '🗡️',
  },
  {
    id: 'saathi-racer',
    title: 'Saathi Racer',
    ne: 'साथी रेसर',
    desc: 'Race a rival bot — and the ghost of your own best run. Type the passage faster than both to take the lead.',
    icon: '🏁',
  },
]

export default function GamePicker({ onPick }: GamePickerProps) {
  const bestScores = useProgress((s) => s.bestGameScores)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h2 className="mb-2 text-2xl font-bold text-text">Games</h2>
      <p className="mb-8 text-sub">Practice disguised as play — both English and Nepali.</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => onPick(g.id)}
            className="group flex flex-col items-start rounded-2xl border border-surface bg-surface p-6 text-left transition hover:scale-[1.02] hover:border-main"
          >
            <div className="mb-3 text-4xl">{g.icon}</div>
            <div className="mb-1 text-xl font-bold text-text group-hover:text-main">{g.title}</div>
            <div className="mb-3 font-devanagari text-sm text-sub">{g.ne}</div>
            <p className="mb-4 text-sm leading-relaxed text-sub">{g.desc}</p>
            <div className="mt-auto text-xs text-main">
              Best: {bestScores[g.id] ?? 0}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
