import { z } from "zod";

export default async function orgRoutes(app: any) {
  /**
   * Helpers
   */
  async function getOrg(orgId: string) {
    return app.db
      .selectFrom("organizations")
      .select([
        "id",
        "name",
        "email",
        "phone",
        "logo_url",
        "description",
        "status",
        "created_by",
        "created_at",
        "updated_at",
      ])
      .where("id", "=", orgId as any)
      .executeTakeFirst();
  }

  async function assertOrgOwnerOrSuperadmin(req: any, reply: any, orgId: string) {
    if (req.user?.role === "SUPERADMIN") return;

    const org = await app.db
      .selectFrom("organizations")
      .select(["id", "created_by"])
      .where("id", "=", orgId as any)
      .executeTakeFirst();

    if (!org) return reply.notFound("Org not found");
    if (String(org.created_by) !== String(req.user.id)) return reply.forbidden("Forbidden");
  }

  async function assertOrgOwnerOrgAdminOrSuperadmin(req: any, reply: any, orgId: string) {
    if (req.user?.role === "SUPERADMIN") return;
    if (req.user?.role !== "ORG_ADMIN") return reply.forbidden("ORG_ADMIN only");

    const org = await app.db
      .selectFrom("organizations")
      .select(["id", "created_by"])
      .where("id", "=", orgId as any)
      .executeTakeFirst();

    if (!org) return reply.notFound("Org not found");
    if (String(org.created_by) !== String(req.user.id)) return reply.forbidden("Forbidden");
  }

  async function isOrgStaff(orgId: string, userId: string) {
    const r = await app.db
      .selectFrom("org_members")
      .select(["id", "status"])
      .where("org_id", "=", orgId as any)
      .where("user_id", "=", userId as any)
      .where("status", "=", "ACTIVE")
      .executeTakeFirst();

    return !!r;
  }

  /**
   * 1) ORG_ADMIN -> create org (PENDING)
   * POST /api/v1/orgs
   */
  const CreateOrgSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    logoUrl: z.string().url().optional(),
    description: z.string().max(2000).optional(),
  });

  app.post(
    "/",
    { preHandler: [app.authenticate, app.requireRole(["ORG_ADMIN"])] },
    async (req: any, reply: any) => {
      const body = CreateOrgSchema.parse(req.body);

      const org = await app.db
        .insertInto("organizations")
        .values({
          name: body.name,
          email: body.email ?? null,
          phone: body.phone ?? null,
          logo_url: body.logoUrl ?? null,
          description: body.description ?? null,
          status: "PENDING",
          created_by: req.user.id,
        })
        .returning(["id", "name", "status", "created_by", "created_at"])
        .executeTakeFirst();

      return reply.code(201).send({ org });
    }
  );

  /**
   * 2) ORG_ADMIN -> list my orgs
   * GET /api/v1/orgs/my
   */
  app.get(
    "/my",
    { preHandler: [app.authenticate, app.requireRole(["ORG_ADMIN"])] },
    async (req: any) => {
      const orgs = await app.db
        .selectFrom("organizations")
        .select(["id", "name", "status", "created_at"])
        .where("created_by", "=", req.user.id)
        .orderBy("created_at", "desc")
        .execute();

      return { orgs };
    }
  );

  /**
   * 3) PUBLIC -> get org detail
   * GET /api/v1/orgs/:id
   */
  app.get("/:id", async (req: any, reply: any) => {
    const orgId = String(req.params.id);

    const org = await getOrg(orgId);
    if (!org) return reply.notFound("Org not found");

    const authHeader = req.headers?.authorization;
    if (org.status !== "ACTIVE") {
      if (!authHeader) return reply.notFound("Org not found");
      try {
        const payload = await req.jwtVerify();
        const uid = String(payload.id ?? payload.sub ?? "");
        const role = payload.role;

        if (role === "SUPERADMIN") return { org };
        if (role === "ORG_ADMIN" && String(org.created_by) === uid) return { org };

        return reply.notFound("Org not found");
      } catch {
        return reply.notFound("Org not found");
      }
    }

    return { org };
  });

  /**
   * 4) ORG_ADMIN(owner) / SUPERADMIN -> update org profile
   * PATCH /api/v1/orgs/:id
   */
  const UpdateOrgSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(6).nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
  });

  app.patch(
    "/:id",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);
      const body = UpdateOrgSchema.parse(req.body);

      await assertOrgOwnerOrSuperadmin(req, reply, orgId);

      const updated = await app.db
        .updateTable("organizations")
        .set({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.logoUrl !== undefined ? { logo_url: body.logoUrl } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        })
        .where("id", "=", orgId as any)
        .returning(["id", "name", "email", "phone", "logo_url", "description", "status", "updated_at"])
        .executeTakeFirst();

      if (!updated) return reply.notFound("Org not found");
      return { org: updated };
    }
  );

  /**
   * STAFF APPLICATIONS
   * POST /api/v1/orgs/:id/staff-applications
   */
  const StaffApplySchema = z.object({
    message: z.string().max(1000).optional(),
  });

  app.post(
    "/:id/staff-applications",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);
      const body = StaffApplySchema.parse(req.body);

      const org = await app.db
        .selectFrom("organizations")
        .select(["id", "status"])
        .where("id", "=", orgId as any)
        .executeTakeFirst();

      if (!org) return reply.notFound("Org not found");
      if (org.status !== "ACTIVE") return reply.badRequest("Org is not active");

      const alreadyStaff = await isOrgStaff(orgId, req.user.id);
      if (alreadyStaff) return reply.conflict("Already staff");

      try {
        const created = await app.db
          .insertInto("org_staff_applications")
          .values({
            org_id: orgId as any,
            user_id: req.user.id as any,
            status: "PENDING",
            message: body.message ?? null,
            decided_by: null,
            decided_at: null,
            decision_note: null,
          })
          .returning(["id", "status", "created_at"])
          .executeTakeFirst();

        return reply.code(201).send({ application: created });
      } catch {
        return reply.conflict("Application already exists");
      }
    }
  );

  // GET /api/v1/orgs/:id/staff-applications/my
  app.get(
    "/:id/staff-applications/my",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);

      const appRow = await app.db
        .selectFrom("org_staff_applications")
        .select(["id", "status", "message", "decision_note", "created_at", "updated_at"])
        .where("org_id", "=", orgId as any)
        .where("user_id", "=", req.user.id as any)
        .executeTakeFirst();

      if (!appRow) return reply.notFound("No application");
      return { application: appRow };
    }
  );

  // DELETE /api/v1/orgs/:id/staff-applications/my
  app.delete(
    "/:id/staff-applications/my",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);

      const updated = await app.db
        .updateTable("org_staff_applications")
        .set({ status: "CANCELLED" })
        .where("org_id", "=", orgId as any)
        .where("user_id", "=", req.user.id as any)
        .where("status", "=", "PENDING")
        .returning(["id", "status"])
        .executeTakeFirst();

      if (!updated) return reply.notFound("No pending application to cancel");
      return { application: updated };
    }
  );

  /**
   * ORG_ADMIN(owner) / SUPERADMIN -> list staff applications
   * GET /api/v1/orgs/:id/staff-applications?status=PENDING
   */
  app.get(
    "/:id/staff-applications",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);
      const status = req.query?.status as string | undefined;

      await assertOrgOwnerOrgAdminOrSuperadmin(req, reply, orgId);

      let q = app.db
        .selectFrom("org_staff_applications as a")
        .innerJoin("users as u", "u.id", "a.user_id")
        .select([
          "a.id as application_id",
          "a.status",
          "a.message",
          "a.decision_note",
          "a.created_at",
          "u.id as user_id",
          "u.email",
          "u.phone",
          "u.first_name",
          "u.last_name",
        ])
        .where("a.org_id", "=", orgId as any)
        .orderBy("a.created_at", "desc");

      if (status) q = q.where("a.status", "=", status);

      const applications = await q.execute();
      return { applications };
    }
  );

  /**
   * ORG_ADMIN(owner) / SUPERADMIN -> decide staff application
   * PATCH /api/v1/orgs/:id/staff-applications/:appId/decide
   */
  const DecideStaffSchema = z.object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().max(1000).optional(),
  });

  app.patch(
    "/:id/staff-applications/:appId/decide",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);
      const appId = String(req.params.appId);
      const body = DecideStaffSchema.parse(req.body);

      await assertOrgOwnerOrgAdminOrSuperadmin(req, reply, orgId);

      const result = await app.db.transaction().execute(async (trx: any) => {
        const row = await trx
          .selectFrom("org_staff_applications")
          .select(["id", "org_id", "user_id", "status"])
          .where("id", "=", appId as any)
          .where("org_id", "=", orgId as any)
          .executeTakeFirst();

        if (!row) return { kind: "NOT_FOUND" as const };
        if (row.status !== "PENDING") return { kind: "NOT_PENDING" as const };

        const updatedApp = await trx
          .updateTable("org_staff_applications")
          .set({
            status: body.decision,
            decided_by: req.user.id,
            decided_at: new Date(),
            decision_note: body.note ?? null,
          })
          .where("id", "=", appId as any)
          .returning(["id", "status", "user_id"])
          .executeTakeFirst();

        if (body.decision === "APPROVED") {
          await trx
            .insertInto("org_members")
            .values({
              org_id: orgId as any,
              user_id: String(row.user_id) as any,
              org_role: "STAFF",
              status: "ACTIVE",
            })
            .onConflict((oc: any) =>
              oc.columns(["org_id", "user_id"]).doUpdateSet({ status: "ACTIVE" })
            )
            .execute();
        }

        return { kind: "OK" as const, updatedApp };
      });

      if (result.kind === "NOT_FOUND") return reply.notFound("Application not found");
      if (result.kind === "NOT_PENDING") return reply.badRequest("Application is not pending");

      return { application: result.updatedApp };
    }
  );

  /**
   * ORG STAFF list / remove
   * GET /api/v1/orgs/:id/staff
   * DELETE /api/v1/orgs/:id/staff/:userId
   * GET /api/v1/orgs/:id/is-staff
   */
  app.get(
    "/:id/staff",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);
      await assertOrgOwnerOrgAdminOrSuperadmin(req, reply, orgId);

      const staff = await app.db
        .selectFrom("org_members as m")
        .innerJoin("users as u", "u.id", "m.user_id")
        .select([
          "m.id as member_id",
          "m.user_id",
          "m.status",
          "m.created_at",
          "u.email",
          "u.phone",
          "u.first_name",
          "u.last_name",
        ])
        .where("m.org_id", "=", orgId as any)
        .where("m.status", "=", "ACTIVE")
        .orderBy("m.created_at", "desc")
        .execute();

      return { staff };
    }
  );

  app.delete(
    "/:id/staff/:userId",
    { preHandler: [app.authenticate] },
    async (req: any, reply: any) => {
      const orgId = String(req.params.id);
      const userId = String(req.params.userId);

      await assertOrgOwnerOrgAdminOrSuperadmin(req, reply, orgId);

      const updated = await app.db
        .updateTable("org_members")
        .set({ status: "SUSPENDED" })
        .where("org_id", "=", orgId as any)
        .where("user_id", "=", userId as any)
        .returning(["id", "org_id", "user_id", "status"])
        .executeTakeFirst();

      if (!updated) return reply.notFound("Member not found");
      return { member: updated };
    }
  );

  app.get(
    "/:id/is-staff",
    { preHandler: [app.authenticate] },
    async (req: any) => {
      const orgId = String(req.params.id);
      const ok = await isOrgStaff(orgId, req.user.id);
      return { isStaff: ok };
    }
  );
}
