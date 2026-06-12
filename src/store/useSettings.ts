import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../types'
import { setSoundEnabled, setVolume } from '../audio/sounds'

interface SettingsState {
  theme: string
  soundOn: boolean
  volume: number // 0..1
  motionReduced: boolean // user override on top of prefers-reduced-motion
  lang: Lang
  setTheme: (t: string) => void
  setSoundOn: (on: boolean) => void
  setVolumeLevel: (v: number) => void
  setMotionReduced: (on: boolean) => void
  setLang: (l: Lang) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'danphe-dark',
      soundOn: true,
      volume: 0.7,
      motionReduced: false,
      lang: 'en',
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme
        set({ theme })
      },
      setSoundOn: (soundOn) => {
        setSoundEnabled(soundOn)
        set({ soundOn })
      },
      setVolumeLevel: (volume) => {
        setVolume(volume)
        set({ volume })
      },
      setMotionReduced: (motionReduced) => set({ motionReduced }),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'ts.settings.v1',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        document.documentElement.dataset.theme = state.theme
        setSoundEnabled(state.soundOn)
        setVolume(state.volume)
      },
    },
  ),
)
