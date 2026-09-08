import axios from 'axios'

let cachedToken: string | null = null
let pendingPromise: Promise<string> | null = null

/**
 * 서버에서 CSRF 토큰을 조회하고 메모리에 캐싱합니다.
 * 동시 호출이 발생하면 단일 요청만 수행하고 결과를 공유합니다.
 */
export function getCsrfToken(force = false): Promise<string> {
  if (!force && cachedToken) {
    return Promise.resolve(cachedToken)
  }
  if (pendingPromise) {
    return pendingPromise
  }

  pendingPromise = axios
    .get<{ csrfToken: string }>('/api/auth/csrf-token', { withCredentials: true })
    .then((res) => {
      cachedToken = res.data.csrfToken
      return cachedToken
    })
    .finally(() => {
      pendingPromise = null
    })

  return pendingPromise
}

/** 캐싱된 CSRF 토큰을 제거합니다. */
export function clearCsrfToken(): void {
  cachedToken = null
}
