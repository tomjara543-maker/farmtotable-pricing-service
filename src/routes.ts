import { Router } from "express";
import { z } from "zod";
import { requireUser } from "./auth";
import { prisma } from "./db";
import { getRules, publicRules, quote, trackAll } from "./pricing";

const pct = (field: string) =>
  z.coerce.number().min(0, `${field} debe estar entre 0 y 90 %`).max(90, `${field} debe estar entre 0 y 90 %`);

const rulesSchema = z
  .object({
    lowStockKg: z.coerce.number().positive("lowStockKg debe ser mayor que 0"),
    lowStockSurgePct: pct("lowStockSurgePct"),
    highStockKg: z.coerce.number().positive("highStockKg debe ser mayor que 0"),
    highStockDiscountPct: pct("highStockDiscountPct"),
    expiryDays: z.coerce.number().int("expiryDays debe ser un número entero").min(0, "expiryDays no puede ser negativo"),
    expiryDiscountPct: pct("expiryDiscountPct"),
  })
  .refine((r) => r.highStockKg > r.lowStockKg, "El umbral de mucha oferta debe ser mayor al de poca oferta");

export function pricingRoutes() {
  const router = Router();
  router.use(requireUser("ADMIN"));

  router.get("/rules", async (_req, res) => {
    res.json(publicRules(await getRules()));
  });

  router.put("/rules", async (req, res) => {
    const data = rulesSchema.parse(req.body);
    const rules = await prisma.pricingRules.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    await trackAll("Cambio de reglas");
    res.json(publicRules(rules));
  });

  router.get("/products", async (_req, res) => {
    const rules = await getRules();
    const products = await prisma.productPricing.findMany({ include: { batches: true }, orderBy: { createdAt: "asc" } });
    res.json(
      products.map((p) => ({ productId: p.productId, name: p.name, basePrice: p.basePrice, ...quote(rules, p, p.batches) })),
    );
  });

  router.get("/history/:productId", async (req, res) => {
    const history = await prisma.priceHistory.findMany({ where: { productId: String(req.params.productId) }, orderBy: { at: "asc" } });
    res.json(history.map(({ productId, price, reason, at }) => ({ productId, price, reason, at })));
  });

  return router;
}
