import clubEventRoutes from "./modules/events/club-event.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSessionMiddleware } from "./config/session.js";
import { csrf } from "./middleware/csrf.js";
import { errorHandler } from "./lib/errors.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import academicRoutes from "./modules/academic/academic.routes.js";
import spaceRoutes from "./modules/spaces/space.routes.js";
import contentRoutes from "./modules/spaces/content.routes.js";
import scheduleRoutes from "./modules/schedule/schedule.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import clubRoutes from "./modules/clubs/club.routes.js";
import campusRoutes from "./modules/campus/campus.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import fileRoutes from "./modules/files/file.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import pollRoutes from "./modules/polls/poll.routes.js";
import { reportRoutes, moderationRoutes } from "./modules/moderation/moderation.routes.js";

export function createApp({ sessionStore } = {}) {
  const app = express();
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.get("/api/v1/health", (req, res) => { const healthy = mongoose.connection.readyState === 1; res.status(healthy ? 200 : 503).json({ success: healthy, status: healthy ? "ok" : "unavailable" }); });
  app.locals.sessionMiddleware = createSessionMiddleware(sessionStore);
  app.use(app.locals.sessionMiddleware);
  app.use("/api/v1", csrf);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/academic", academicRoutes);
  app.use("/api/v1/spaces", spaceRoutes);
  app.use("/api/v1/spaces/:spaceId/events", clubEventRoutes);
  app.use("/api/v1/spaces/:spaceId", contentRoutes);
  app.use("/api/v1/spaces/:spaceId/schedule", scheduleRoutes);
  app.use("/api/v1", dashboardRoutes);
  app.use("/api/v1/clubs", clubRoutes);
  app.use("/api/v1/campus", campusRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/files", fileRoutes);
  app.use("/api/v1/search", searchRoutes);
  app.use("/api/v1/spaces/:spaceId/polls", pollRoutes);
  app.use("/api/v1/reports", reportRoutes);
  app.use("/api/v1/admin/moderation", moderationRoutes);
  if (process.env.NODE_ENV === "production") {
    const dist = fileURLToPath(new URL("../../client/dist/", import.meta.url));
    app.use(express.static(dist));
    app.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api/") || !req.accepts("html")) return next();
      res.set("Cache-Control", "no-cache").sendFile(path.join(dist, "index.html"));
    });
  }
  app.use((req, res) => res.status(404).json({ success: false, message: "Route not found." }));
  app.use(errorHandler);
  return app;
}
export default createApp;
