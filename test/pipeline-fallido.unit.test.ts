import assert from "node:assert/strict";
import { test } from "node:test";

test("prueba fallida a propósito para demostrar que el pipeline bloquea el despliegue", () => {
  assert.equal(1 + 1, 3);
});
