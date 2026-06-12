import { memo } from 'react'
import { toDevanagari } from '../../engine/transliterate'

export interface DevanagariPreviewProps {
  /** The roman text that has been typed so far. */
  romanTyped: string
}

/**
 * Large centred live Devanagari rendering of the roman sequence typed so far.
 * Re-runs the whole transliteration each keystroke (the engine is intentionally
 * unstable per keystroke), showing only the current word being composed.
 */
function DevanagariPreviewImpl({ romanTyped }: DevanagariPreviewProps) {
  // Only render the in-progress word so the preview stays large and readable.
  const lastSpace = romanTyped.lastIndexOf(' ')
  const currentWord = lastSpace >= 0 ? romanTyped.slice(lastSpace + 1) : romanTyped
  const dev = currentWord ? toDevanagari(currentWord) : ''

  return (
    <div className="flex min-h-[5rem] items-center justify-center">
      <span className="font-devanagari text-6xl leading-none text-main" aria-live="polite">
        {dev || ' '}
      </span>
    </div>
  )
}

const DevanagariPreview = memo(DevanagariPreviewImpl)
DevanagariPreview.displayName = 'DevanagariPreview'
export default DevanagariPreview
