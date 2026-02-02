export default async function adminOrgRoutes(app: any) {
  // GET /api/v1/admin/orgs/pending
  app.get(
    "/orgs/pending",
    { preHandler: [app.authenticate, app.requireRole(["SUPERADMIN"])] },
    async () => {
      const orgs = await app.db
        .selectFrom("organizations")
        .select(["id", "name", "status", "created_by", "created_at"])
        .where("status", "=", "PENDING")
        .orderBy("created_at", "asc")
        .execute();

      return { orgs };
    }
  );

  // GET /api/v1/admin/orgs?status=...
  app.get(
    "/orgs",
    { preHandler: [app.authenticate, app.requireRole(["SUPERADMIN"])] },
    async (req: any) => {
      const status = req.query?.status as string | undefined;

      let q = app.db
        .selectFrom("organizations")
        .select(["id", "name", "status", "created_by", "created_at"])
        .orderBy("created_at", "desc");

      if (status) q = q.where("status", "=", status);

      const orgs = await q.execute();
      return { orgs };
    }
  );

  // POST /api/v1/admin/orgs/:id/approve
  app.post(
    "/orgs/:id/approve",
    { preHandler: [app.authenticate, app.requireRole(["SUPERADMIN"])] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);

      const updated = await app.db
        .updateTable("organizations")
        .set({ status: "ACTIVE" })
        .where("id", "=", orgId as any)
        .where("status", "=", "PENDING")
        .returning(["id", "name", "status"])
        .executeTakeFirst();

      if (!updated) return reply.notFound("Org not found or not pending");
      return { org: updated };
    }
  );

  // POST /api/v1/admin/orgs/:id/suspend
  app.post(
    "/orgs/:id/suspend",
    { preHandler: [app.authenticate, app.requireRole(["SUPERADMIN"])] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);

      const updated = await app.db
        .updateTable("organizations")
        .set({ status: "SUSPENDED" })
        .where("id", "=", orgId as any)
        .returning(["id", "name", "status"])
        .executeTakeFirst();

      if (!updated) return reply.notFound("Org not found");
      return { org: updated };
    }
  );
}
