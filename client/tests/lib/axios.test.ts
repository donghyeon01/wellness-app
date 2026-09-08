import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'

const mockInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
  },
}

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => mockInstance),
    },
  }
})

describe('api axios instance', () => {
  it('baseURL이 /api이고 withCredentials가 true인 인스턴스를 생성한다', async () => {
    await import('@/lib/axios')
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: '/api',
        withCredentials: true,
      }),
    )
  })

  it('mutation 메서드 요청에 대해 X-CSRF-Token 헤더를 추가하는 인터셉터를 등록한다', async () => {
    await import('@/lib/axios')
    expect(mockInstance.interceptors.request.use).toHaveBeenCalled()
  })
})
