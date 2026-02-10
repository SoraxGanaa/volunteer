import { z } from "zod";

export default async function eventRoutes(app: any) {
  async function getEvent(eventId: string) {
    return app.db
      .selectFrom("events as e")
      .innerJoin("organizations as o", "o.id", "e.org_id")
      .select([
        "e.id",
        "e.org_id",
        "e.created_by",
        "e.title",
        "e.description",
        "e.category",
        "e.city",
        "e.address",
        "e.lat",
        "e.lng",
        "e.start_at",
        "e.end_at",
        "e.capacity",
        "e.status",
        "o.status as org_status",
        "o.created_by as org_owner",
      ])
      .where("e.id", "=", eventId as any)
      .executeTakeFirst();
  }

  async function isOrgStaff(orgId: string, userId: string) {
    const r = await app.db
      .selectFrom("org_members")
      .select(["id"])
      .where("org_id", "=", orgId as any)
      .where("user_id", "=", userId as any)
      .where("status", "=", "ACTIVE")
      .executeTakeFirst();
    return !!r;
  }

  async function assertOrgOwnerOrSuper(req: any, reply: any, orgId: string) {
    if (req.user.role === "SUPERADMIN") return;
    if (req.user.role !== "ORG_ADMIN") return reply.forbidden("Forbidden");

    const org = await app.db
      .selectFrom("organizations")
      .select(["id", "created_by", "status"])
      .where("id", "=", orgId as any)
      .executeTakeFirst();

    if (!org) return reply.notFound("Org not found");
    if (String(org.created_by) !== String(req.user.id))
      return reply.forbidden("Forbidden");
  }

  /**
   * PUBLIC - list published events
   * GET /api/v1/events?city=&q=&orgId=
   */
  app.get("/", async (req: any) => {
    const q = (req.query?.q as string | undefined)?.trim();
    const city = (req.query?.city as string | undefined)?.trim();
    const orgId = (req.query?.orgId as string | undefined)?.trim();

    let query = app.db
      .selectFrom("events as e")
      .innerJoin("organizations as o", "o.id", "e.org_id")
      .select([
        "e.id",
        "e.title",
        "e.banner_url", 
        "e.city",
        "e.start_at",
        "e.end_at",
        "e.capacity",
        "e.status",
        "o.name as org_name",
      ])

      .where("e.status", "=", "PUBLISHED")
      .where("o.status", "=", "ACTIVE")
      .orderBy("e.start_at", "asc");

    if (city) query = query.where("e.city", "=", city);
    if (orgId) query = query.where("e.org_id", "=", orgId as any);
    if (q) query = query.where("e.title", "ilike", `%${q}%`);

    const events = await query.execute();
    return { events };
  });

  /**
   * PUBLIC - event detail (published only)
   * GET /api/v1/events/:id
   */
  app.get("/:id", async (req: any, reply: any) => {
    const eventId = String(req.params.id);
    const e = await getEvent(eventId);
    if (!e) return reply.notFound("Event not found");

    if (e.status !== "PUBLISHED" || e.org_status !== "ACTIVE") {
      return reply.notFound("Event not found");
    }

    return { event: e };
  });

  /**
   * ORG_ADMIN/SUPERADMIN - publish/cancel/complete
   * POST /api/v1/events/:id/publish
   * POST /api/v1/events/:id/cancel
   * POST /api/v1/events/:id/complete
   */
  app.post(
    "/:id/publish",
    {
      preHandler: [
        app.authenticate,
        app.requireRole(["ORG_ADMIN", "SUPERADMIN"]),
      ],
    },
    async (req: any, reply: any) => {
      const eventId = String(req.params.id);
      const e = await getEvent(eventId);
      if (!e) return reply.notFound("Event not found");

      if (req.user.role !== "SUPERADMIN") {
        await assertOrgOwnerOrSuper(req, reply, String(e.org_id));
      }

      if (e.org_status !== "ACTIVE")
        return reply.badRequest("Org is not active");
      if (e.status !== "DRAFT")
        return reply.badRequest("Only DRAFT can be published");

      const updated = await app.db
        .updateTable("events")
        .set({ status: "PUBLISHED" })
        .where("id", "=", eventId as any)
        .returning(["id", "status"])
        .executeTakeFirst();

      return { event: updated };
    },
  );

  app.post(
    "/:id/cancel",
    {
      preHandler: [
        app.authenticate,
        app.requireRole(["ORG_ADMIN", "SUPERADMIN"]),
      ],
    },
    async (req: any, reply: any) => {
      const eventId = String(req.params.id);
      const e = await getEvent(eventId);
      if (!e) return reply.notFound("Event not found");

      if (req.user.role !== "SUPERADMIN") {
        await assertOrgOwnerOrSuper(req, reply, String(e.org_id));
      }

      const updated = await app.db
        .updateTable("events")
        .set({ status: "CANCELLED" })
        .where("id", "=", eventId as any)
        .returning(["id", "status"])
        .executeTakeFirst();

      return { event: updated };
    },
  );

  app.post(
    "/:id/complete",
    {
      preHandler: [
        app.authenticate,
        app.requireRole(["ORG_ADMIN", "SUPERADMIN"]),
      ],
    },
    async (req: any, reply: any) => {
      const eventId = String(req.params.id);
      const e = await getEvent(eventId);
      if (!e) return reply.notFound("Event not found");

      if (req.user.role !== "SUPERADMIN") {
        await assertOrgOwnerOrSuper(req, reply, String(e.org_id));
      }

      const updated = await app.db
        .updateTable("events")
        .set({ status: "COMPLETED" })
        .where("id", "=", eventId as any)
        .returning(["id", "status"])
        .executeTakeFirst();

      return { event: updated };
    },
  );

  /**
   * Auth user -> check if current user is staff of event
   * GET /api/v1/events/:id/is-staff
   */
  app.get(
    "/:id/is-staff",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const eventId = String(req.params.id);
      const e = await getEvent(eventId);
      if (!e) return reply.notFound("Event not found");

      const ok =
        req.user.role === "SUPERADMIN" ||
        (req.user.role === "ORG_ADMIN" &&
          String(e.org_owner) === String(req.user.id)) ||
        (await isOrgStaff(String(e.org_id), String(req.user.id)));

      return { isStaff: ok };
    },
  );
}
