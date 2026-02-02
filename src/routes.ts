import type { FastifyPluginAsync } from "fastify";

import authRoutes from "./modules/auth/routes";
import orgRoutes from "./modules/orgs/routes";
import eventRoutes from "./modules/events/routes";
import orgEventRoutes from "./modules/events/org.routes";

import attendanceRoutes from "./modules/attendance/routes";
import eventApplicationRoutes from "./modules/applications/routes";
import meApplicationRoutes from "./modules/applications/me.routes";
import certificateRoutes from "./modules/certificates/routes";

const apiRoutes: FastifyPluginAsync = async (app) => {
  // auth
  app.register(authRoutes, { prefix: "/auth" });

  // org
  app.register(orgRoutes, { prefix: "/orgs" });
  app.register(orgEventRoutes, { prefix: "/orgs" });

  // events + children
  app.register(eventRoutes, { prefix: "/events" });
  app.register(attendanceRoutes, { prefix: "/events" });
  app.register(eventApplicationRoutes, { prefix: "/events" });

  // me
  app.register(certificateRoutes, { prefix: "/me" });
  app.register(meApplicationRoutes, { prefix: "/me" });
};

export default apiRoutes;
