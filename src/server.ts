import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";

import dbPlugin from "./plugins/db";
import authPlugin from "./plugins/auth";
import authRoutes from "./modules/auth/routes";
import orgRoutes from "./modules/orgs/routes";
import eventRoutes from "./modules/events/routes";
import applicationRoutes from "./modules/applications/routes";
import attendanceRoutes from "./modules/attendance/routes";
import certificateRoutes from "./modules/certificates/routes";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(sensible);

  app.register(jwt, { secret: process.env.JWT_SECRET || "dev-secret" });

  app.register(dbPlugin);
  app.register(authPlugin);

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(orgRoutes);
  app.register(eventRoutes);
  app.register(applicationRoutes);
  app.register(attendanceRoutes);
  app.register(certificateRoutes);

  return app;
}
