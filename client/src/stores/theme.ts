import { create } from 'zustand'
import type { Theme } from '@/types/schemas'

export const STORAGE_KEY = 'wellness-theme'

export function isValidTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isValidTheme(stored)) return stored
  } catch {
    // localStorage 접근 실패 시 기본값 사용
  }
  return 'system'
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useTheme = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    set({ theme })
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        // localStorage 미지원 환경 무시
      }
    }
  },
}))
