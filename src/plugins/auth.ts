import fp from "fastify-plugin";

export default fp(async (app) => {
  app.decorate("authenticate", async (req: any, reply: any) => {
    try {
      const payload = await req.jwtVerify();

      const id = payload.id ?? payload.sub; 
      if (!id) return reply.unauthorized("Invalid token");

      req.user = { id: String(id), role: payload.role };
    } catch {
      return reply.unauthorized("Unauthorized");
    }
  });

  app.decorate(
    "requireRole",
    (roles: Array<"SUPERADMIN" | "ORG_ADMIN" | "USER">) => {
      return async (req: any, reply: any) => {
        if (!req.user) return reply.unauthorized("Unauthorized");
        if (!roles.includes(req.user.role)) return reply.forbidden("Forbidden");
      };
    },
  );
});
