import "fastify";
import type { Kysely } from "kysely";
import type { DB } from "../db/types";

declare module "fastify" {
  interface FastifyInstance {
    db: Kysely<DB>;
    authenticate: any;
    requireRole: (roles: Array<"SUPERADMIN" | "ORG_ADMIN" | "USER">) => any;
  }
  interface FastifyRequest {
    user?: {
      id: string;
      role: "SUPERADMIN" | "ORG_ADMIN" | "USER";
    };
  }
}
