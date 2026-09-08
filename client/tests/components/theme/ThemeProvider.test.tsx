import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { useTheme, STORAGE_KEY } from '@/stores/theme'

type ChangeListener = (event: { matches: boolean }) => void

interface MockMql {
  matches: boolean
  media: string
  onchange: null
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  addListener: ReturnType<typeof vi.fn>
  removeListener: ReturnType<typeof vi.fn>
  dispatchEvent: ReturnType<typeof vi.fn>
  dispatch: (next: boolean) => void
}

// jsdom에는 matchMedia가 없으므로 OS 다크 모드 변경을 흉내 내는 목을 주입한다.
function mockMatchMedia(initialMatches: boolean): MockMql {
  const listeners = new Set<ChangeListener>()
  const mql: MockMql = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_type: string, cb: ChangeListener) => {
      listeners.add(cb)
    }),
    removeEventListener: vi.fn((_type: string, cb: ChangeListener) => {
      listeners.delete(cb)
    }),
    addListener: vi.fn((cb: ChangeListener) => {
      listeners.add(cb)
    }),
    removeListener: vi.fn((cb: ChangeListener) => {
      listeners.delete(cb)
    }),
    dispatchEvent: vi.fn(),
    dispatch: (next: boolean) => {
      mql.matches = next
      listeners.forEach((cb) => cb({ matches: next }))
    },
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => mql),
  })
  return mql
}

const originalMatchMedia = window.matchMedia

function resetDomTheme() {
  document.documentElement.classList.remove('light', 'dark')
  document.body.classList.remove('light', 'dark')
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetDomTheme()
    useTheme.setState({ theme: 'system' })
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('children을 렌더링한다', () => {
    render(
      <ThemeProvider>
        <div>콘텐츠</div>
      </ThemeProvider>,
    )
    expect(screen.getByText('콘텐츠')).toBeDefined()
  })

  it('light 테마는 html과 body에 light 클래스를 적용한다', () => {
    useTheme.setState({ theme: 'light' })
    render(<ThemeProvider>{null}</ThemeProvider>)

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('light')).toBe(true)
  })

  it('dark 테마는 html과 body에 dark 클래스를 적용한다', () => {
    useTheme.setState({ theme: 'dark' })
    render(<ThemeProvider>{null}</ThemeProvider>)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.body.classList.contains('dark')).toBe(true)
  })

  it('system 모드는 OS가 다크면 dark 클래스를 적용한다', () => {
    mockMatchMedia(true)
    useTheme.setState({ theme: 'system' })
    render(<ThemeProvider>{null}</ThemeProvider>)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('system 모드는 OS가 라이트면 light 클래스를 적용한다', () => {
    mockMatchMedia(false)
    useTheme.setState({ theme: 'system' })
    render(<ThemeProvider>{null}</ThemeProvider>)

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('system 모드에서 OS 설정이 바뀌면 테마가 다시 적용된다', () => {
    const mql = mockMatchMedia(true)
    useTheme.setState({ theme: 'system' })
    render(<ThemeProvider>{null}</ThemeProvider>)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => {
      mql.dispatch(false)
    })

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('matchMedia를 지원하지 않는 환경에서는 system을 light로 폴백한다', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    })
    useTheme.setState({ theme: 'system' })
    render(<ThemeProvider>{null}</ThemeProvider>)

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('테마를 변경하면 클래스가 갱신되고 localStorage에 유지된다', () => {
    render(<ThemeProvider>{null}</ThemeProvider>)

    act(() => {
      useTheme.getState().setTheme('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })
})
