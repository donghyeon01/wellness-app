import { Link } from 'react-router-dom'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/stores/theme'
import type { Theme } from '@/types/schemas'

// 토글 순서: light → dark → system → light
const THEME_ORDER: Theme[] = ['light', 'dark', 'system']

const THEME_LABELS: Record<Theme, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
}

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

function nextTheme(theme: Theme): Theme {
  const index = THEME_ORDER.indexOf(theme)
  return THEME_ORDER[(index + 1) % THEME_ORDER.length]
}

export function Header() {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)
  const Icon = THEME_ICONS[theme]

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-card-foreground">
          Wellness App
        </Link>
        <button
          type="button"
          onClick={() => setTheme(nextTheme(theme))}
          aria-label="테마 전환"
          title={`현재 테마: ${THEME_LABELS[theme]}`}
          className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{THEME_LABELS[theme]}</span>
        </button>
      </div>
    </header>
  )
}
