import { MarkAttendanceSchema } from "./schemas";
import * as svc from "./service";

export default async function attendanceRoutes(app: any) {
  // PUT /api/v1/events/:eventId/attendance/:userId
  app.put(
    "/:eventId/attendance/:userId",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const eventId = String(req.params.eventId);
      const userId = String(req.params.userId);
      const body = MarkAttendanceSchema.parse(req.body);

      const r = await svc.markAttendance(app.db, req.user, eventId, userId, body);

      if (r.kind === "NOT_FOUND") return reply.notFound("Event not found");
      if (r.kind === "FORBIDDEN") return reply.forbidden("Forbidden");
      if (r.kind === "NOT_APPROVED")
        return reply.badRequest("User is not approved for this event");

      return { ok: true };
    }
  );

  // GET /api/v1/events/:eventId/attendance
  app.get(
    "/:eventId/attendance",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const eventId = String(req.params.eventId);
      const r = await svc.listAttendance(app.db, req.user, eventId);

      if (r.kind === "NOT_FOUND") return reply.notFound("Event not found");
      if (r.kind === "FORBIDDEN") return reply.forbidden("Forbidden");

      return { attendance: r.rows };
    }
  );
}
