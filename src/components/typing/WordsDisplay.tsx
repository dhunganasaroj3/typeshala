import { memo } from 'react'

export interface WordsDisplayProps {
  /** The full target text being typed. */
  text: string
  /** Index of the caret (next char to type). */
  pos: number
  /** Per-position status for already-passed characters: true = correct, false = incorrect. */
  status: boolean[]
  /** Ref attached to the active-character span so the caret can be positioned. */
  activeRef: React.RefObject<HTMLSpanElement | null>
}

/**
 * Renders the target text as individually coloured grapheme spans.
 *  - pending  -> text-sub
 *  - correct  -> text-text
 *  - incorrect-> text-error with underline (space errors get a red background)
 * Memoized so the per-frame caret animation never re-renders the whole text.
 */
function WordsDisplayImpl({ text, pos, status, activeRef }: WordsDisplayProps) {
  const chars = Array.from(text)

  return (
    <div className="relative flex flex-wrap text-2xl leading-relaxed tracking-wide select-none">
      {chars.map((ch, i) => {
        let cls = 'text-sub'
        if (i < pos) {
          if (status[i]) cls = 'text-text'
          else cls = ch === ' ' ? 'text-error bg-error/25' : 'text-error underline decoration-error/70'
        }
        return (
          <span key={i} ref={i === pos ? activeRef : undefined} className={cls}>
            {ch === ' ' ? ' ' : ch}
          </span>
        )
      })}
      {/* trailing sentinel so the caret can rest after the last character */}
      <span ref={pos >= chars.length ? activeRef : undefined} className="text-sub">
        {'​'}
      </span>
    </div>
  )
}

const WordsDisplay = memo(WordsDisplayImpl)
WordsDisplay.displayName = 'WordsDisplay'
export default WordsDisplay
