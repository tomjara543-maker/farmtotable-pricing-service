import cors from "cors";
import express from "express";
import { errorHandler } from "./http";
import { pricingRoutes } from "./routes";
import { metricsHandler, metricsMiddleware } from "./metrics";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware);

  app.get("/health", (_req, res) => res.json({ service: "pricing-service", status: "ok" }));
  app.get("/metrics", metricsHandler);
  app.use("/pricing", pricingRoutes());
  app.use(errorHandler);
  return app;
}
