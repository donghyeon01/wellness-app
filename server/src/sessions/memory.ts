import { SessionData, SessionStore } from './store'

interface Entry {
  data: SessionData
  expiresAt: number
}

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Entry>()

  private now(): number {
    return Date.now()
  }

  private cleanup(sessionId: string): boolean {
    const entry = this.sessions.get(sessionId)
    if (!entry) return true
    if (entry.expiresAt <= this.now()) {
      this.sessions.delete(sessionId)
      return true
    }
    return false
  }

  async get(sessionId: string): Promise<SessionData | null> {
    if (this.cleanup(sessionId)) return null
    const entry = this.sessions.get(sessionId)!
    return { ...entry.data }
  }

  async set(sessionId: string, data: SessionData, ttlSec: number): Promise<void> {
    this.sessions.set(sessionId, {
      data: { ...data },
      expiresAt: this.now() + ttlSec * 1000,
    })
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async touch(sessionId: string, ttlSec: number): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) return
    if (entry.expiresAt <= this.now()) {
      this.sessions.delete(sessionId)
      return
    }
    entry.expiresAt = this.now() + ttlSec * 1000
    entry.data.lastAccess = this.now()
  }

  clear(): void {
    this.sessions.clear()
  }
}
