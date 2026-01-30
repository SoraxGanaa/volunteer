import "dotenv/config";
import { buildApp } from "./server";

const app = buildApp();

app.listen({ port: 3000, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
