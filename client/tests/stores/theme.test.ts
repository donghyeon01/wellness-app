import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, getInitialTheme, isValidTheme, STORAGE_KEY } from '@/stores/theme'

describe('useTheme store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
    useTheme.setState({ theme: 'system' })
  })

  it('isValidTheme은 light/dark/system만 허용한다', () => {
    expect(isValidTheme('light')).toBe(true)
    expect(isValidTheme('dark')).toBe(true)
    expect(isValidTheme('system')).toBe(true)
    expect(isValidTheme('red')).toBe(false)
    expect(isValidTheme(null)).toBe(false)
  })

  it('getInitialTheme은 localStorage 값을 읽어온다', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark')
    expect(getInitialTheme()).toBe('dark')
  })

  it('getInitialTheme은 잘못된 값이면 system을 반환한다', () => {
    window.localStorage.setItem(STORAGE_KEY, 'invalid')
    expect(getInitialTheme()).toBe('system')
  })

  it('getInitialTheme은 저장된 값이 없으면 system을 반환한다', () => {
    expect(getInitialTheme()).toBe('system')
  })

  it('기본값은 system이다', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
  })

  it('setTheme로 테마를 변경하면 localStorage에 동기화된다', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('light')
    })

    expect(result.current.theme).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('setTheme로 system을 설정할 수 있다', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
      result.current.setTheme('system')
    })

    expect(result.current.theme).toBe('system')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('system')
  })
})
