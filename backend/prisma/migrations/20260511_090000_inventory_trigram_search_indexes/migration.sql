CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx"
  ON "products" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_generic_name_trgm_idx"
  ON "products" USING GIN ("genericName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_brand_name_trgm_idx"
  ON "products" USING GIN ("brandName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_strength_trgm_idx"
  ON "products" USING GIN ("strength" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_manufacturer_trgm_idx"
  ON "products" USING GIN ("manufacturer" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_therapeutic_category_trgm_idx"
  ON "products" USING GIN ("therapeutic_category" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_tmda_registration_number_trgm_idx"
  ON "products" USING GIN ("tmda_registration_number" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "drug_products_product_name_trgm_idx"
  ON "drug_products" USING GIN ("product_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "drug_products_generic_name_trgm_idx"
  ON "drug_products" USING GIN ("generic_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "drug_products_tmda_registration_number_trgm_idx"
  ON "drug_products" USING GIN ("tmda_registration_number" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "drug_products_msd_code_trgm_idx"
  ON "drug_products" USING GIN ("msd_code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "product_aliases_alias_trgm_idx"
  ON "product_aliases" USING GIN ("alias" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "brands_name_trgm_idx"
  ON "brands" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "manufacturers_name_trgm_idx"
  ON "manufacturers" USING GIN ("name" gin_trgm_ops);
