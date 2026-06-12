// Theme registry. Palettes live as CSS custom properties in src/index.css,
// keyed by [data-theme="<id>"]; the picker swaps document.documentElement.dataset.theme.
import type { ThemeDef } from '../types'

export const THEMES: ThemeDef[] = [
  { id: 'danphe-dark', name: 'Danphe Dark', tokens: { main: '#2dd4bf', bg: '#0e1525' } },
  { id: 'himal-light', name: 'Himal Light', tokens: { main: '#0e7490', bg: '#f4f6fb' } },
  { id: 'mitho-momo', name: 'Mitho Momo', tokens: { main: '#f97362', bg: '#2b1517' } },
  { id: 'sagarmatha', name: 'Sagarmatha', tokens: { main: '#7dd3fc', bg: '#0b1929' } },
  { id: 'gruvbox', name: 'Gruvbox', tokens: { main: '#fabd2f', bg: '#282828' } },
  { id: 'terminal', name: 'Terminal Green', tokens: { main: '#22c55e', bg: '#0a0f0a' } },
]
