import { createApp } from "./app";
import { registerConsumers } from "./consumers";
import { connectEvents } from "./events";
import { trackAll } from "./pricing";

const PORT = Number(process.env.PORT ?? 4010);
const RECHECK_MS = 60 * 60 * 1000;

async function main() {
  await registerConsumers();
  await connectEvents();

  createApp().listen(PORT, () => console.log(`pricing-service escuchando en http://localhost:${PORT}`));

  setInterval(() => trackAll("Cercanía al vencimiento").catch((err) => console.error("[pricing]", err)), RECHECK_MS);
}

main();
