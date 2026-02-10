import { z } from "zod";

export default async function orgEventRoutes(app: any) {
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
   * ORG_ADMIN(owner) - create event (org must be ACTIVE)
   * POST /api/v1/orgs/:orgId/events
   */
  const CreateEventSchema = z.object({
    title: z.string().min(2),
    description: z.string().max(5000).optional(),
    bannerUrl: z.string().url().optional(),
    category: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    address: z.string().max(200).optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
    startAt: z.string(), // ISO
    endAt: z.string().optional(),
    capacity: z.number().int().min(0).optional(), // 0 unlimited
  });

  app.post(
    "/:orgId/events",
    { preHandler: [app.authenticate, app.requireRole(["ORG_ADMIN"])] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.orgId);
      const body = CreateEventSchema.parse(req.body);

      await assertOrgOwnerOrSuper(req, reply, orgId);

      const org = await app.db
        .selectFrom("organizations")
        .select(["status"])
        .where("id", "=", orgId as any)
        .executeTakeFirst();

      if (!org) return reply.notFound("Org not found");
      if (org.status !== "ACTIVE") return reply.badRequest("Org is not active");

      const start_at = new Date(body.startAt);
      const end_at = body.endAt ? new Date(body.endAt) : null;
      if (end_at && end_at < start_at)
        return reply.badRequest("endAt must be >= startAt");

      const event = await app.db
        .insertInto("events")
        .values({
          org_id: orgId as any,
          created_by: req.user.id,
          title: body.title,
          description: body.description ?? null,
          banner_url: body.bannerUrl ?? null, 
          category: body.category ?? null,
          city: body.city ?? null,
          address: body.address ?? null,
          lat: body.lat ?? null,
          lng: body.lng ?? null,
          start_at,
          end_at,
          capacity: body.capacity ?? 0,
          status: "DRAFT",
        })

        .returning(["id", "title", "status", "start_at"])
        .executeTakeFirst();

      return reply.code(201).send({ event });
    },
  );

  /**
   * ORG_ADMIN(owner) - list org events (all statuses)
   * GET /api/v1/orgs/:orgId/events
   */
  app.get(
    "/:orgId/events",
    { preHandler: [app.authenticate, app.requireRole(["ORG_ADMIN"])] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.orgId);
      await assertOrgOwnerOrSuper(req, reply, orgId);

      const events = await app.db
        .selectFrom("events")
        .select(["id", "title", "status", "start_at", "capacity", "created_at"])
        .where("org_id", "=", orgId as any)
        .orderBy("created_at", "desc")
        .execute();

      return { events };
    },
  );
}
