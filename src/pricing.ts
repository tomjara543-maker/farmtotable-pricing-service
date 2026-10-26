import { prisma } from "./db";
import { publish } from "./events";
import { PricingBatch, PricingRules, ProductPricing } from "./generated/prisma/client";
import { daysBetween, round2, today } from "./http";

export async function getRules() {
  return prisma.pricingRules.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}

export const publicRules = ({ id: _id, ...rules }: PricingRules) => rules;

export function quote(rules: PricingRules, product: ProductPricing, batches: PricingBatch[]) {
  const t = today();
  const live = batches.filter((b) => b.quantityAvailable > 0 && b.expiryEstimate >= t);
  const kg = round2(live.reduce((s, b) => s + b.quantityAvailable, 0));
  const expiries = live.map((b) => daysBetween(t, b.expiryEstimate));
  const daysToExpiry = expiries.length ? Math.min(...expiries) : null;

  const adjustments: { label: string; pct: number }[] = [];
  if (kg > 0 && kg < rules.lowStockKg) adjustments.push({ label: "Poca oferta", pct: rules.lowStockSurgePct });
  else if (kg > rules.highStockKg) adjustments.push({ label: "Mucha oferta", pct: -rules.highStockDiscountPct });
  if (daysToExpiry !== null && daysToExpiry <= rules.expiryDays) {
    adjustments.push({ label: "Próximo a vencer", pct: -rules.expiryDiscountPct });
  }
  const factor = Math.max(0.1, 1 + adjustments.reduce((s, a) => s + a.pct, 0) / 100);
  return { currentPrice: Math.round(product.basePrice * factor), availableKg: kg, daysToExpiry, adjustments };
}

export async function trackPrice(productId: string, reason: string) {
  const product = await prisma.productPricing.findUnique({ where: { productId }, include: { batches: true } });
  if (!product) return;
  const { currentPrice } = quote(await getRules(), product, product.batches);
  if (currentPrice === product.currentPrice) return;
  await prisma.$transaction([
    prisma.productPricing.update({ where: { productId }, data: { currentPrice } }),
    prisma.priceHistory.create({ data: { productId, price: currentPrice, reason } }),
  ]);
  publish("price.updated", { productId, from: product.currentPrice, to: currentPrice, reason });
}

export async function trackAll(reason: string) {
  const products = await prisma.productPricing.findMany({ select: { productId: true } });
  for (const p of products) await trackPrice(p.productId, reason);
}
