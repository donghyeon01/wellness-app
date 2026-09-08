import { SessionData } from '@/sessions/store'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string }
      session?: SessionData
    }
  }
}

export {}
