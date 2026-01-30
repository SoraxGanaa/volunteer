import fp from "fastify-plugin";
import { db } from "../db/kysely";

export default fp(async (app) => {
  app.decorate("db", db);

  app.addHook("onClose", async () => {
    await db.destroy();
  });
});
