import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { as, request, Running, startApp } from "./helpers";

let api: Running;

const validRules = {
  lowStockKg: 50,
  lowStockSurgePct: 20,
  highStockKg: 1000,
  highStockDiscountPct: 15,
  expiryDays: 3,
  expiryDiscountPct: 25,
};

before(async () => {
  const { createApp } = await import("../src/app");
  api = await startApp(createApp());
});

after(() => api.close());

test("las reglas de precios solo las consulta y modifica un administrador", async () => {
  assert.equal((await request(api.url, "/pricing/rules")).status, 401);
  assert.equal((await request(api.url, "/pricing/rules", { headers: as("b-1", "BUYER") })).status, 403);
  assert.equal(
    (await request(api.url, "/pricing/rules", { method: "PUT", headers: as("p-1", "PRODUCER"), body: validRules })).status,
    403,
  );
});

test("PUT /pricing/rules rechaza porcentajes fuera de rango y umbrales incoherentes", async () => {
  const admin = as("admin-1", "ADMIN");

  const tooHigh = await request(api.url, "/pricing/rules", { method: "PUT", headers: admin, body: { ...validRules, expiryDiscountPct: 95 } });
  assert.equal(tooHigh.status, 400);
  assert.match(tooHigh.body.error, /expiryDiscountPct debe estar entre 0 y 90 %/);

  const inverted = await request(api.url, "/pricing/rules", {
    method: "PUT",
    headers: admin,
    body: { ...validRules, lowStockKg: 500, highStockKg: 100 },
  });
  assert.equal(inverted.status, 400);
  assert.match(inverted.body.error, /mucha oferta debe ser mayor al de poca oferta/);
});
