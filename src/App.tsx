import { useEffect } from 'react'
import { useUI } from './store/useUI'
import { useSettings } from './store/useSettings'
import Header from './components/Header'
import Footer from './components/Footer'
import CelebrationLayer from './components/CelebrationLayer'
import TestView from './components/TestView'
import LessonsView from './components/lessons/LessonsView'
import GamesView from './components/games/GamesView'
import StatsView from './components/stats/StatsView'
import SettingsView from './components/settings/SettingsView'

export default function App() {
  const view = useUI((s) => s.view)
  const theme = useSettings((s) => s.theme)

  // apply theme on mount / when it changes (store also sets it on rehydrate)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="min-h-full flex flex-col bg-bg text-text">
      <Header />

      <main className="flex-1 flex flex-col">
        {view === 'test' && <TestView />}
        {view === 'lessons' && <LessonsView />}
        {view === 'games' && <GamesView />}
        {view === 'stats' && <StatsView />}
        {view === 'settings' && <SettingsView />}
      </main>

      <Footer />
      <CelebrationLayer />
    </div>
  )
}
