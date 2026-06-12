import { useMemo, useState } from 'react'
import type { Lesson } from '../../types'
import TypingCore from '../typing/TypingCore'
import type { CompletedRun } from '../typing/TypingCore'
import { accuracy as accuracyPct } from '../../engine/metrics'
import { useProgress } from '../../store/useProgress'
import { runResultPipeline } from '../../game/celebrate'

interface LessonPlayerProps {
  lesson: Lesson
  onExit: () => void
}

interface StarResult {
  acc: number // 0..100
  stars: number
  passed: boolean
}

function starsFor(lesson: Lesson, acc01: number): number {
  if (acc01 >= lesson.stars.three) return 3
  if (acc01 >= lesson.stars.two) return 2
  if (acc01 >= lesson.minAccuracy) return 1
  return 0
}

export default function LessonPlayer({ lesson, onExit }: LessonPlayerProps) {
  const recordLesson = useProgress((s) => s.recordLesson)
  const alreadyPassed = useProgress((s) => s.lessons[lesson.id]?.passed ?? false)

  const [result, setResult] = useState<StarResult | null>(null)
  // remount key for TypingCore to support Retry
  const [attempt, setAttempt] = useState(0)

  const text = useMemo(() => lesson.items.map((it) => it.roman).join(' '), [lesson])
  const devText = useMemo(() => {
    if (lesson.lang !== 'ne') return undefined
    return lesson.items.map((it) => it.dev ?? '').join(' ')
  }, [lesson])

  // Hints fade on first attempt only (before any pass).
  const showHints = lesson.lang === 'ne' && !alreadyPassed && attempt === 0

  const handleComplete = (run: CompletedRun) => {
    const acc = accuracyPct(run.correctChars, run.incorrect) // 0..100
    const acc01 = acc / 100
    const stars = starsFor(lesson, acc01)
    const passed = acc01 >= lesson.minAccuracy

    recordLesson(lesson.id, acc01, stars, passed)
    runResultPipeline({
      lang: lesson.lang,
      mode: 'lesson',
      mode2: lesson.id,
      run,
    })

    setResult({ acc, stars, passed })
  }

  const retry = () => {
    setResult(null)
    setAttempt((a) => a + 1)
  }

  if (result) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-16 text-center">
        <div className="text-sm uppercase tracking-wider text-sub">{lesson.id}</div>
        <h2
          className={`mb-4 text-2xl font-bold text-text ${
            lesson.lang === 'ne' ? 'font-devanagari' : ''
          }`}
        >
          {lesson.title}
        </h2>

        <div className="mb-2 flex gap-2 text-5xl" aria-label={`${result.stars} stars`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= result.stars ? 'text-xp' : 'text-sub opacity-30'}>
              ★
            </span>
          ))}
        </div>

        <div className="mb-1 text-3xl font-bold text-main">{result.acc.toFixed(1)}%</div>
        <div
          className={`mb-8 text-sm font-medium ${
            result.passed ? 'text-success' : 'text-error'
          }`}
        >
          {result.passed
            ? 'Passed!'
            : `Need ${(lesson.minAccuracy * 100).toFixed(0)}% to pass`}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-md bg-surface px-5 py-2 text-sm font-medium text-text hover:bg-main hover:text-bg"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-md bg-main px-5 py-2 text-sm font-medium text-bg"
          >
            Back to lessons
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-sub">
            {lesson.unit} · {lesson.id}
          </div>
          <h2
            className={`text-xl font-bold text-text ${
              lesson.lang === 'ne' ? 'font-devanagari' : ''
            }`}
          >
            {lesson.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md bg-surface px-3 py-1.5 text-sm text-sub hover:text-text"
        >
          Exit
        </button>
      </div>

      {showHints && (
        <div className="mb-4 rounded-md bg-surface/60 p-3 text-center text-sm text-sub">
          <span className="font-mono">{text}</span>
        </div>
      )}

      <TypingCore
        key={attempt}
        text={text}
        lang={lesson.lang}
        devText={devText}
        onComplete={handleComplete}
        autoFocus
      />
    </div>
  )
}
