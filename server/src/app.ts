import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { authMiddleware } from '@/middleware/auth'
import { csrfMiddleware } from '@/middleware/csrf'
import authRoutes from '@/routes/auth'
import { MemorySessionStore } from '@/sessions/memory'
import { SessionStore } from '@/sessions/store'

export function createApp(sessionStore: SessionStore = new MemorySessionStore()) {
  const app = express()
  app.locals.sessionStore = sessionStore
  app.use(helmet())
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use(authMiddleware)
  app.use(csrfMiddleware)
  app.use('/api/auth', authRoutes)
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  return app
}
