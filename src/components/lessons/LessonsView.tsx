import { useState } from 'react'
import type { Lesson } from '../../types'
import LessonGrid from './LessonGrid'
import LessonPlayer from './LessonPlayer'

export default function LessonsView() {
  const [active, setActive] = useState<Lesson | null>(null)

  if (active) {
    return <LessonPlayer lesson={active} onExit={() => setActive(null)} />
  }
  return <LessonGrid onPick={setActive} />
}
