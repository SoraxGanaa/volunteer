import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";

import dbPlugin from "./plugins/db";
import authPlugin from "./plugins/auth";
import apiRoutes from "./routes";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(sensible);

  app.register(jwt, { secret: process.env.JWT_SECRET || "dev-secret" });

  app.register(dbPlugin);
  app.register(authPlugin);

  app.get("/health", async () => ({ ok: true }));

  app.register(apiRoutes, { prefix: "/api/v1" });

  return app;
}
