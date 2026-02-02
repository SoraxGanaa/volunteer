import { isAppError } from "./errors";
import * as svc from "./service";

export default async function meApplicationRoutes(app: any) {
  const handle = (reply: any, e: any) => {
    if (isAppError(e)) {
      if (e.httpStatus === 400) return reply.badRequest(e.message);
      if (e.httpStatus === 401) return reply.unauthorized(e.message);
      if (e.httpStatus === 403) return reply.forbidden(e.message);
      if (e.httpStatus === 404) return reply.notFound(e.message);
      if (e.httpStatus === 409) return reply.conflict(e.message);
      return reply.code(e.httpStatus).send({ message: e.message, code: e.code });
    }
    throw e;
  };

  // GET /api/v1/me/applications
  app.get(
    "/applications",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      try {
        const list = await svc.listMyApplications(app.db, req.user);
        return { applications: list };
      } catch (e) {
        return handle(reply, e);
      }
    }
  );
}
