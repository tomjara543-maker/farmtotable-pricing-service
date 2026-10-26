import cors from "cors";
import express from "express";
import { registerConsumers } from "./consumers";
import { connectEvents } from "./events";
import { errorHandler } from "./http";
import { trackAll } from "./pricing";
import { pricingRoutes } from "./routes";

const PORT = Number(process.env.PORT ?? 4010);
const RECHECK_MS = 60 * 60 * 1000;

async function main() {
  await registerConsumers();
  await connectEvents();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ service: "pricing-service", status: "ok" }));
  app.use("/pricing", pricingRoutes());
  app.use(errorHandler);

  app.listen(PORT, () => console.log(`pricing-service escuchando en http://localhost:${PORT}`));

  setInterval(() => trackAll("Cercanía al vencimiento").catch((err) => console.error("[pricing]", err)), RECHECK_MS);
}

main();
