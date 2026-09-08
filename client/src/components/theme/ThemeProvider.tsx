import { useContext, useEffect, useRef } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { useTheme } from '@/stores/theme'
import { useAuth } from '@/stores/auth'
import { useSettings, useUpdateSettings } from '@/api/settings'
import type { Theme } from '@/types/schemas'

const MEDIA_QUERY = '(prefers-color-scheme: dark)'
const RESOLVED_THEMES = ['light', 'dark'] as const

type ResolvedTheme = (typeof RESOLVED_THEMES)[number]

// jsdom 등 matchMedia를 지원하지 않는 환경에서는 light로 폴백한다.
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
}

// Tailwind darkMode 'class' 전략: 실제 적용 테마 클래스를 html과 body에 반영한다.
function applyThemeClass(theme: Theme) {
  const resolved: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme
  for (const el of [document.documentElement, document.body]) {
    el.classList.remove(...RESOLVED_THEMES)
    el.classList.add(resolved)
  }
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useTheme((state) => state.theme)

  useEffect(() => {
    applyThemeClass(theme)
    // system 모드에서는 OS 설정 변경을 실시간으로 따라간다.
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return

    const mql = window.matchMedia(MEDIA_QUERY)
    const onChange = () => applyThemeClass('system')
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    // 구형 Safari 호환 (addListener/removeListener)
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [theme])

  return (
    <>
      <ThemeSync />
      {children}
    </>
  )
}

/**
 * 서버 사용자 설정(DB)과 로컬 테마 상태(localStorage)를 동기화한다.
 * QueryClientProvider 밖이거나 비로그인 상태에서는 마운트되지 않아 아무 동작도 하지 않는다.
 */
export function ThemeSync() {
  const queryClient = useContext(QueryClientContext)
  const user = useAuth((state) => state.user)
  if (!queryClient || !user) return null
  return <ThemeSyncInner />
}

function ThemeSyncInner() {
  const theme = useTheme((state) => state.theme)
  const setTheme = useTheme((state) => state.setTheme)
  const { data: settings } = useSettings()
  const { mutate: persistTheme } = useUpdateSettings()

  const prevTheme = useRef(theme)
  const syncedFromServer = useRef(false)
  // 첫 서버 조회 전에 사용자가 직접 변경하면 서버 값으로 덮어쓰지 않기 위한 플래그
  const dirty = useRef(false)

  // 서버 → 로컬: 저장된 테마를 최초 1회만 반영한다 (이후에는 로컬 선택을 우선).
  useEffect(() => {
    const serverTheme = settings?.theme
    if (syncedFromServer.current || dirty.current || !serverTheme) return
    syncedFromServer.current = true
    prevTheme.current = serverTheme
    if (serverTheme !== useTheme.getState().theme) {
      setTheme(serverTheme)
    }
  }, [settings?.theme, setTheme])

  // 로컬 → 서버: 사용자가 바꾼 테마를 사용자 설정(DB)에 저장한다.
  useEffect(() => {
    if (prevTheme.current === theme) return
    prevTheme.current = theme
    dirty.current = true
    persistTheme(theme)
  }, [theme, persistTheme])

  return null
}
