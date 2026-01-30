import { CreateCertSchema, UpdateCertSchema } from "./schemas";
import * as svc from "./service";

export default async function certificateRoutes(app: any) {
  app.post(
    "/me/certificates",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      const body = CreateCertSchema.parse(req.body);
      const cert = await svc.createCert(app.db, req.user, body);
      return reply.code(201).send({ certificate: cert });
    }
  );

  app.get(
    "/me/certificates",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any) => {
      const certificates = await svc.listCerts(app.db, req.user);
      return { certificates };
    }
  );

  app.patch(
    "/me/certificates/:id",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      const id = String(req.params.id);
      const body = UpdateCertSchema.parse(req.body);

      const updated = await svc.updateCert(app.db, req.user, id, body);
      if (!updated) return reply.notFound("Certificate not found");

      return { certificate: updated };
    }
  );

  app.delete(
    "/me/certificates/:id",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any, reply: any) => {
      const id = String(req.params.id);
      const deleted = await svc.deleteCert(app.db, req.user, id);
      if (!deleted) return reply.notFound("Certificate not found");
      return { ok: true };
    }
  );

  app.get(
    "/me/history",
    { preHandler: [app.authenticate, app.requireRole(["USER"])] },
    async (req: any) => {
      const history = await svc.myHistory(app.db, req.user);
      return { history };
    }
  );
}
