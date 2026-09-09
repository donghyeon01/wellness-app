import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Layout } from '@/components/layout/Layout'
import { useTheme, STORAGE_KEY } from '@/stores/theme'

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useTheme.setState({ theme: 'system' })
  })

  it('테마 토글 버튼과 현재 모드 라벨을 표시한다', () => {
    renderHeader()

    const toggle = screen.getByRole('button', { name: '테마 전환' })
    expect(toggle).toBeDefined()
    expect(screen.getByText('시스템')).toBeDefined()
  })

  it('토글 클릭 시 system → light 순서로 변경되고 localStorage에 저장된다', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: '테마 전환' }))

    expect(useTheme.getState().theme).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
    expect(screen.getByText('라이트')).toBeDefined()
  })

  it('연속 클릭 시 light → dark → system을 순환한다', async () => {
    const user = userEvent.setup()
    useTheme.setState({ theme: 'light' })
    renderHeader()

    const toggle = screen.getByRole('button', { name: '테마 전환' })
    await user.click(toggle)
    expect(useTheme.getState().theme).toBe('dark')
    await user.click(toggle)
    expect(useTheme.getState().theme).toBe('system')
    await user.click(toggle)
    expect(useTheme.getState().theme).toBe('light')
  })
})

describe('Layout', () => {
  it('헤더와 children을 함께 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>본문</div>
        </Layout>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: '테마 전환' })).toBeDefined()
    expect(screen.getByText('본문')).toBeDefined()
  })
})
