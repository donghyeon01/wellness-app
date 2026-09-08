import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { getCsrfToken, clearCsrfToken } from '@/lib/csrf'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
    },
  }
})

describe('getCsrfToken', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.resetAllMocks()
  })

  it('GET /api/auth/csrf-token을 호출하고 토큰을 캐싱한다', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { csrfToken: 'token-123' } })

    const token = await getCsrfToken()

    expect(token).toBe('token-123')
    expect(axios.get).toHaveBeenCalledWith('/api/auth/csrf-token', { withCredentials: true })
  })

  it('캐싱된 토큰이 있으면 추가 요청 없이 재사용한다', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { csrfToken: 'token-123' } })

    await getCsrfToken()
    const token = await getCsrfToken()

    expect(token).toBe('token-123')
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('force=true이면 캐시를 무시하고 새 토큰을 요청한다', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: { csrfToken: 'token-1' } })
      .mockResolvedValueOnce({ data: { csrfToken: 'token-2' } })

    await getCsrfToken()
    const token = await getCsrfToken(true)

    expect(token).toBe('token-2')
    expect(axios.get).toHaveBeenCalledTimes(2)
  })
})
