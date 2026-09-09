import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authMiddleware } from "@/middleware/auth";
import { csrfMiddleware } from "@/middleware/csrf";
import authRoutes from "@/routes/auth";
import pomodoroRoutes from "@/routes/pomodoro";
import memoRoutes from "@/routes/memos";
import eventRoutes from "@/routes/events";
import todoRoutes from "@/routes/todos";
import diaryRoutes from "@/routes/diary";
import { MemorySessionStore } from "@/sessions/memory";
import { SessionStore } from "@/sessions/store";

export function createApp(
  sessionStore: SessionStore = new MemorySessionStore(),
) {
  const app = express();
  app.locals.sessionStore = sessionStore;
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(authMiddleware);
  app.use(csrfMiddleware);
  app.use("/api/auth", authRoutes);
  app.use("/api/pomodoro", pomodoroRoutes);
  app.use("/api/memos", memoRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/todos", todoRoutes);
  app.use("/api/diaries", diaryRoutes);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  return app;
}
