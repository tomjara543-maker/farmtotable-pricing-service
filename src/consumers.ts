import { idempotent, prisma } from "./db";
import { subscribe } from "./events";
import { trackPrice } from "./pricing";

interface Allocation {
  batchId: string;
  productId: string;
  quantityKg: number;
}

async function adjust(allocations: Allocation[], sign: 1 | -1, reason: string) {
  for (const a of allocations) {
    await prisma.pricingBatch.updateMany({ where: { batchId: a.batchId }, data: { quantityAvailable: { increment: sign * a.quantityKg } } });
  }
  for (const productId of new Set(allocations.map((a) => a.productId))) await trackPrice(productId, reason);
}

async function ensureProduct(data: { productId: string; name: string; basePrice: number }) {
  const { count } = await prisma.productPricing.createMany({
    data: [{ productId: data.productId, name: data.name, basePrice: data.basePrice, currentPrice: data.basePrice }],
    skipDuplicates: true,
  });
  if (count) await prisma.priceHistory.create({ data: { productId: data.productId, price: data.basePrice, reason: "Precio inicial" } });
}

export async function registerConsumers() {
  await subscribe(
    "pricing-service",
    ["product.created", "product.available", "inventory.reserved", "inventory.released"],
    idempotent(async ({ eventType, data }) => {
      if (eventType === "product.created") await ensureProduct(data);
      if (eventType === "product.available") {
        await ensureProduct(data);
        await prisma.pricingBatch.upsert({
          where: { batchId: data.batchId },
          create: { batchId: data.batchId, productId: data.productId, quantityAvailable: data.quantityKg, expiryEstimate: data.expiryEstimate },
          update: {},
        });
        await trackPrice(data.productId, "Nueva cosecha");
      }
      if (eventType === "inventory.reserved") await adjust(data.allocations, -1, "Reserva de stock");
      if (eventType === "inventory.released") await adjust(data.allocations, 1, "Stock liberado");
    }),
  );
}
