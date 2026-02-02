import { ApplySchema, DecideSchema, ListApplicationsQuerySchema } from "./schemas";
import { isAppError } from "./errors";
import * as svc from "./service";

export default async function eventApplicationRoutes(app: any) {
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

  // POST /api/v1/events/:id/apply
  app.post(
    "/:id/apply",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      try {
        const eventId = String(req.params.id);
        const body = ApplySchema.parse(req.body);

        const created = await svc.applyToEvent(app.db, req.user, eventId, body.message);
        return reply.code(201).send({ application: created });
      } catch (e) {
        return handle(reply, e);
      }
    }
  );

  // DELETE /api/v1/events/:id/apply
  app.delete(
    "/:id/apply",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      try {
        const eventId = String(req.params.id);
        const updated = await svc.cancelMyApplication(app.db, req.user, eventId);
        return { application: updated };
      } catch (e) {
        return handle(reply, e);
      }
    }
  );

  // GET /api/v1/events/:id/applications?status=
  app.get(
    "/:id/applications",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      try {
        const eventId = String(req.params.id);
        const q = ListApplicationsQuerySchema.parse(req.query ?? {});
        const result = await svc.listEventApplications(app.db, req.user, eventId, q.status);
        return result;
      } catch (e) {
        return handle(reply, e);
      }
    }
  );

  // PATCH /api/v1/events/:id/applications/:appId/decide
  app.patch(
    "/:id/applications/:appId/decide",
    { preHandler: [app.authenticate, app.requireRole(["ORG_ADMIN", "SUPERADMIN"])] },
    async (req: any, reply: any) => {
      try {
        const eventId = String(req.params.id);
        const appId = String(req.params.appId);
        const body = DecideSchema.parse(req.body);

        const updated = await svc.decideApplication(
          app.db,
          req.user,
          eventId,
          appId,
          body.decision,
          body.note
        );

        return { application: updated };
      } catch (e) {
        return handle(reply, e);
      }
    }
  );
}
