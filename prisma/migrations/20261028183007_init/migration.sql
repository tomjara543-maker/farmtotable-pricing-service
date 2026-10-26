-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "low_stock_kg" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "low_stock_surge_pct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "high_stock_kg" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "high_stock_discount_pct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "expiry_days" INTEGER NOT NULL DEFAULT 3,
    "expiry_discount_pct" DOUBLE PRECISION NOT NULL DEFAULT 25,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pricing" (
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_price" INTEGER NOT NULL,
    "current_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pricing_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "pricing_batches" (
    "batch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_available" DOUBLE PRECISION NOT NULL,
    "expiry_estimate" TEXT NOT NULL,

    CONSTRAINT "pricing_batches_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "pricing_batches_product_id_idx" ON "pricing_batches"("product_id");

-- CreateIndex
CREATE INDEX "price_history_product_id_at_idx" ON "price_history"("product_id", "at");

-- AddForeignKey
ALTER TABLE "pricing_batches" ADD CONSTRAINT "pricing_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product_pricing"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;
