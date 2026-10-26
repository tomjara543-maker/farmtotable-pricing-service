# pricing-service

Precio dinámico según oferta y cercanía al vencimiento. Parte de **FarmToTable** (marketplace agrícola con microservicios orientados a eventos).

Estado: **Implementado** con PostgreSQL (Prisma) y RabbitMQ. Probado de punta a punta a través del API Gateway.

- Puerto local: `4010` · Ruta pública en el API Gateway: `/api/pricing`
- Base de datos propia (`DATABASE_URL`), nunca compartida con otro servicio
- Eventos por RabbitMQ (exchange topic `farmtotable.events`, ver `src/events.ts`)

## Contrato REST

Es lo que ya consume el frontend (y lo que simula su modo demo en `src/lib/mock/server.ts` del repo del frontend).
El API Gateway valida el JWT y reenvía `x-user-id` / `x-user-role`; usa `requireUser()` de `src/auth.ts`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/pricing/rules` | ADMIN | Reglas actuales |
| `PUT` | `/pricing/rules` | ADMIN | `{ lowStockKg, lowStockSurgePct, highStockKg, highStockDiscountPct, expiryDays, expiryDiscountPct }` (% entre 0 y 90; highStockKg > lowStockKg) → recalcula todo |
| `GET` | `/pricing/products` | ADMIN | `[{ productId, name, basePrice, currentPrice, availableKg, daysToExpiry, adjustments[{label,pct}] }]` |
| `GET` | `/pricing/history/:productId` | ADMIN | `[{ price, reason, at }]` |

Errores: `{ "error": "mensaje" }` con 400 (validación zod), 401, 403, 404, 409 (estado inválido) o 422 (regla de negocio).

## Eventos

Publica:
- price.updated `{ productId, from, to, reason }`

Consume:
- `product.created`
- `product.available`
- `inventory.reserved`
- `inventory.released`

Todo consumidor debe envolverse en `idempotent()` (`src/db.ts`).

## Modelo de datos (Prisma)

- `PricingRules` (fila única)
- `ProductPricing` (productId, basePrice, availableKg, nearestExpiry)
- `PriceHistory` (productId, price, reason, at)
- Fórmula: poca oferta +%, mucha oferta −%, lote que vence en ≤ N días −%; precio = base × (1 + Σ%)

## Desarrollo

```bash
cp .env.example .env    # ajusta DATABASE_URL
npm install
npm run db:migrate      # crea/aplica migraciones
npm run dev
```

## Despliegue

`Dockerfile` + `render.yaml` (Render) y `.github/workflows/ci.yml`: compila en cada push/PR y, en `main`,
publica la imagen en GHCR y dispara el deploy hook de Render si existe el secreto `RENDER_DEPLOY_HOOK_URL`.
