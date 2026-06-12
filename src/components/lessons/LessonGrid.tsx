import { useMemo } from 'react'
import type { Lesson } from '../../types'
import { useSettings } from '../../store/useSettings'
import { useProgress } from '../../store/useProgress'
import { EN_LESSONS } from '../../data/lessons.en'
import { NE_LESSONS } from '../../data/lessons.ne'

interface LessonGridProps {
  onPick: (lesson: Lesson) => void
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? 'text-xp' : 'text-sub opacity-40'}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function LessonGrid({ onPick }: LessonGridProps) {
  const lang = useSettings((s) => s.lang)
  const setLang = useSettings((s) => s.setLang)
  const lessonsProgress = useProgress((s) => s.lessons)

  const lessons = lang === 'en' ? EN_LESSONS : NE_LESSONS

  const units = useMemo(() => {
    const map = new Map<string, Lesson[]>()
    for (const l of lessons) {
      const arr = map.get(l.unit) ?? []
      arr.push(l)
      map.set(l.unit, arr)
    }
    return Array.from(map.entries())
  }, [lessons])

  // A lesson is locked until the previous lesson (by array order) is passed.
  const isLocked = (idx: number): boolean => {
    if (idx === 0) return false
    const prev = lessons[idx - 1]
    return !lessonsProgress[prev.id]?.passed
  }

  const indexOf = (id: string) => lessons.findIndex((l) => l.id === id)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        {(['en', 'ne'] as const).map((l) => (
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

      {units.map(([unit, unitLessons]) => (
        <section key={unit} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
            {unit}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {unitLessons.map((lesson) => {
              const idx = indexOf(lesson.id)
              const locked = isLocked(idx)
              const prog = lessonsProgress[lesson.id]
              const stars = prog?.stars ?? 0
              return (
                <button
                  key={lesson.id}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && onPick(lesson)}
                  className={`flex h-28 flex-col justify-between rounded-lg border border-surface p-3 text-left transition-colors ${
                    locked
                      ? 'cursor-not-allowed bg-bg opacity-50'
                      : 'bg-surface hover:border-main'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-mono text-sub">{lesson.id}</span>
                    {locked ? (
                      <span className="text-sub" aria-label="locked">
                        🔒
                      </span>
                    ) : (
                      <Stars count={stars} />
                    )}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium text-text ${
                        lesson.lang === 'ne' ? 'font-devanagari' : ''
                      }`}
                    >
                      {lesson.title}
                    </div>
                    {lesson.newKeys.length > 0 && (
                      <div className="mt-1 truncate text-xs text-sub">
                        {lesson.newKeys.join(' · ')}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
