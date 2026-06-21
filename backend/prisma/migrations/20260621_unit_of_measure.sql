-- UnitOfMeasure reference table
CREATE TABLE IF NOT EXISTS "units_of_measure" (
  "id"              TEXT        NOT NULL,
  "name"            TEXT        NOT NULL,
  "symbol"          TEXT        NOT NULL,
  "normalized_name" TEXT        NOT NULL,
  "description"     TEXT,
  "is_active"       BOOLEAN     NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "units_of_measure_normalized_name_key"
  ON "units_of_measure"("normalized_name");

-- FK columns on products and drug_products
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "unit_of_measure_id" TEXT;

ALTER TABLE "drug_products"
  ADD COLUMN IF NOT EXISTS "unit_of_measure_id" TEXT;

-- FK constraints
ALTER TABLE "products"
  DROP CONSTRAINT IF EXISTS "products_unit_of_measure_id_fkey";
ALTER TABLE "products"
  ADD CONSTRAINT "products_unit_of_measure_id_fkey"
  FOREIGN KEY ("unit_of_measure_id") REFERENCES "units_of_measure"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "drug_products"
  DROP CONSTRAINT IF EXISTS "drug_products_unit_of_measure_id_fkey";
ALTER TABLE "drug_products"
  ADD CONSTRAINT "drug_products_unit_of_measure_id_fkey"
  FOREIGN KEY ("unit_of_measure_id") REFERENCES "units_of_measure"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index on products
CREATE INDEX IF NOT EXISTS "products_unit_of_measure_id_idx"
  ON "products"("unit_of_measure_id");
