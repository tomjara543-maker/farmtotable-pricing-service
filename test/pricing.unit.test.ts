import assert from "node:assert/strict";
import { test } from "node:test";
import { toDate } from "../src/http";
import { quote } from "../src/pricing";

const rules = {
  id: 1,
  lowStockKg: 50,
  lowStockSurgePct: 20,
  highStockKg: 1000,
  highStockDiscountPct: 15,
  expiryDays: 3,
  expiryDiscountPct: 25,
};
const product = { productId: "p-1", name: "Fresa", basePrice: 10_000, currentPrice: 10_000, createdAt: new Date() };
const inDays = (n: number) => toDate(new Date(Date.now() + n * 86_400_000));
const batch = (batchId: string, quantityAvailable: number, days: number) => ({
  batchId,
  productId: "p-1",
  quantityAvailable,
  expiryEstimate: inDays(days),
});

test("quote combina recargo por poca oferta y descuento por vencimiento, ignorando lotes vencidos o agotados", () => {
  const result = quote(rules, product, [batch("b1", 30, 2), batch("b-vencido", 500, -1), batch("b-agotado", 0, 5)]);

  assert.equal(result.availableKg, 30);
  assert.equal(result.daysToExpiry, 2);
  assert.deepEqual(result.adjustments, [
    { label: "Poca oferta", pct: 20 },
    { label: "Próximo a vencer", pct: -25 },
  ]);
  assert.equal(result.currentPrice, 9_500);
});

test("quote aplica descuento por mucha oferta y deja el precio base sin stock", () => {
  const abundant = quote(rules, product, [batch("b1", 800, 10), batch("b2", 400.5, 12)]);
  assert.equal(abundant.availableKg, 1200.5);
  assert.deepEqual(abundant.adjustments, [{ label: "Mucha oferta", pct: -15 }]);
  assert.equal(abundant.currentPrice, 8_500);

  const empty = quote(rules, product, []);
  assert.deepEqual(empty, { currentPrice: 10_000, availableKg: 0, daysToExpiry: null, adjustments: [] });
});
