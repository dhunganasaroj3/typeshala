import { useUI } from '../store/useUI'

export default function Footer() {
  const typingFocus = useUI((s) => s.typingFocus)

  return (
    <footer
      className={`w-full px-4 py-3 flex items-center justify-center gap-6 text-xs text-sub flex-wrap ${
        typingFocus ? 'focus-dim' : ''
      }`}
    >
      <span className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 rounded bg-surface text-text">Tab</kbd>
        restart
      </span>
      <span className="flex items-center gap-1.5">
        <kbd className="px-1.5 py-0.5 rounded bg-surface text-text">Esc</kbd>
        reset
      </span>
      <span className="opacity-70">⌨ Best on a physical keyboard</span>
    </footer>
  )
}
