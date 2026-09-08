import { randomUUID } from 'node:crypto'
import { SessionData, SessionStore } from '@/sessions/store'

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export async function createCsrfToken(sessionId: string, store: SessionStore): Promise<string> {
  const token = randomUUID()
  const session = (await store.get(sessionId)) ?? {
    createdAt: Date.now(),
    lastAccess: Date.now(),
  }
  session.csrfToken = token
  await store.set(sessionId, session, SESSION_TTL_SECONDS)
  return token
}

export async function verifyCsrfToken(
  session: SessionData | undefined,
  token: string | undefined,
): Promise<boolean> {
  if (!session?.csrfToken || !token) return false
  const a = Buffer.from(session.csrfToken)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}
