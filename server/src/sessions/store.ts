export interface SessionData {
  userId?: string
  csrfToken?: string
  createdAt: number
  lastAccess: number
}

export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>
  set(sessionId: string, data: SessionData, ttlSec: number): Promise<void>
  delete(sessionId: string): Promise<void>
  touch(sessionId: string, ttlSec: number): Promise<void>
}
