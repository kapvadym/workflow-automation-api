import express from "express";
import { healthRouter } from "./routes/health";
import { webhooksRouter } from "./routes/webhooks";
import { runsRouter } from "./routes/runs";

export function createApp() {
  const app = express();

  app.use(healthRouter);
  app.use(webhooksRouter);
  app.use(runsRouter);

  return app;
}
