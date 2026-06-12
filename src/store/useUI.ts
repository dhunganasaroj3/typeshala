import { create } from 'zustand'
import type { Toast, View } from '../types'

interface UIState {
  view: View
  /** true while a drill is actively being typed — header/footer dim */
  typingFocus: boolean
  toasts: Toast[]
  setView: (v: View) => void
  setTypingFocus: (on: boolean) => void
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

let toastSeq = 0

export const useUI = create<UIState>()((set) => ({
  view: 'test',
  typingFocus: false,
  toasts: [],
  setView: (view) => set({ view, typingFocus: false }),
  setTypingFocus: (typingFocus) => set({ typingFocus }),
  pushToast: (t) => {
    const id = `toast-${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    // auto-dismiss; large/epic toasts linger longer
    const ttl = t.tier === 'large' || t.tier === 'epic' ? 6000 : 3500
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, ttl)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
