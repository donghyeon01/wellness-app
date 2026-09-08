import http from 'node:http'
import type { Express } from 'express'

export class TestClient {
  private baseUrl: string
  cookies: Record<string, string | null> = {}
  csrfToken?: string

  constructor(port: number) {
    this.baseUrl = `http://127.0.0.1:${port}`
  }

  parseCookies(res: Response): void {
    const raw: string[] = res.headers.getSetCookie?.() ?? []
    for (const header of raw) {
      const [pair] = header.split(';')
      const [name, ...rest] = pair.split('=')
      const value = rest.join('=').trim()
      const key = name.trim()
      this.cookies[key] = value === '' ? null : decodeURIComponent(value)
    }
    this.csrfToken = this.cookies['csrf-token'] ?? undefined
  }

  cookieHeader(): string {
    return Object.entries(this.cookies)
      .filter((entry): entry is [string, string] => entry[1] !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ')
  }

  async request(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {}
    if (method !== 'GET' && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const cookie = this.cookieHeader()
    if (cookie) headers['Cookie'] = cookie
    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  }
}

export async function startServer(app: Express): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(app)
  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err)
    server.once('error', onError)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError)
      resolve()
    })
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return { server, port }
}
