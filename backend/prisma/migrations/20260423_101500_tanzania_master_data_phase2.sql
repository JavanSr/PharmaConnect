DO $$
BEGIN
  CREATE TYPE "SourceDocumentType" AS ENUM (
    'PRODUCT_REGISTER',
    'SMPC',
    'TPAR',
    'NEMLIT',
    'MSD_CATALOGUE',
    'WHO_EML',
    'WHO_MODEL_FORMULARY',
    'BNF',
    'STG',
    'ADDENDUM',
    'MANUAL_ENTRY',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SourceTrustLevel" AS ENUM (
    'OFFICIAL_PRIMARY',
    'OFFICIAL_SECONDARY',
    'PROCUREMENT_PRIMARY',
    'INTERNATIONAL_FALLBACK',
    'MANUAL_REVIEW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ImportMethod" AS ENUM (
    'API_SYNC',
    'HTML_SCRAPE',
    'PDF_EXTRACTION',
    'CSV_IMPORT',
    'XLSX_IMPORT',
    'MANUAL_ENTRY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM (
    'DRAFT',
    'IMPORTED',
    'NEEDS_VERIFICATION',
    'REVIEWED',
    'APPROVED',
    'REJECTED',
    'RETIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReviewQueueStatus" AS ENUM (
    'DRAFT',
    'IMPORTED',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'RETIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AliasType" AS ENUM (
    'BRAND',
    'GENERIC',
    'SPELLING_VARIANT',
    'MSD_CODE',
    'TMDA_REGISTRATION',
    'LOCAL_NAME'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReviewerType" AS ENUM (
    'PLATFORM_PHARMACIST',
    'PIC_OVERRIDE',
    'TMDA_REFERENCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'drug_master'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'drug_products'
  ) THEN
    ALTER TABLE "drug_master" RENAME TO "drug_products";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'drugMasterId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'drug_product_id'
  ) THEN
    ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_drugMasterId_fkey";
    ALTER TABLE "products" RENAME COLUMN "drugMasterId" TO "drug_product_id";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "brands" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brands_normalized_name_key"
  ON "brands" ("normalized_name");

CREATE INDEX IF NOT EXISTS "brands_name_idx"
  ON "brands" ("name");

CREATE TABLE IF NOT EXISTS "manufacturers" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "country" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "manufacturers_normalized_name_key"
  ON "manufacturers" ("normalized_name");

CREATE INDEX IF NOT EXISTS "manufacturers_name_idx"
  ON "manufacturers" ("name");

CREATE TABLE IF NOT EXISTS "registrants" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "country" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registrants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "registrants_normalized_name_key"
  ON "registrants" ("normalized_name");

CREATE INDEX IF NOT EXISTS "registrants_name_idx"
  ON "registrants" ("name");

CREATE TABLE IF NOT EXISTS "dosage_forms" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dosage_forms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dosage_forms_normalized_name_key"
  ON "dosage_forms" ("normalized_name");

CREATE TABLE IF NOT EXISTS "strengths" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "display_name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "numerator_value" DECIMAL(12,4),
  "numerator_unit" TEXT,
  "denominator_value" DECIMAL(12,4),
  "denominator_unit" TEXT,
  "is_combination" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strengths_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "strengths_normalized_name_key"
  ON "strengths" ("normalized_name");

CREATE TABLE IF NOT EXISTS "routes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "routes_normalized_name_key"
  ON "routes" ("normalized_name");

CREATE TABLE IF NOT EXISTS "pack_sizes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "display_name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "quantity" DECIMAL(12,2),
  "unit" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pack_sizes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pack_sizes_normalized_name_key"
  ON "pack_sizes" ("normalized_name");

CREATE TABLE IF NOT EXISTS "therapeutic_classes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "code" TEXT,
  "parent_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "therapeutic_classes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "therapeutic_classes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "therapeutic_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "therapeutic_classes_normalized_name_key"
  ON "therapeutic_classes" ("normalized_name");

CREATE INDEX IF NOT EXISTS "therapeutic_classes_name_idx"
  ON "therapeutic_classes" ("name");

CREATE TABLE IF NOT EXISTS "source_documents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "source_name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "source_type" "SourceDocumentType" NOT NULL,
  "trust_level" "SourceTrustLevel" NOT NULL,
  "import_method" "ImportMethod" NOT NULL,
  "issuing_authority" TEXT,
  "document_version" TEXT,
  "publication_date" TIMESTAMP(3),
  "effective_date" TIMESTAMP(3),
  "last_checked_at" TIMESTAMP(3),
  "checksum" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "source_documents_source_name_type_idx"
  ON "source_documents" ("source_name", "source_type");

CREATE TABLE IF NOT EXISTS "active_ingredients" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "atc_code" TEXT,
  "therapeutic_class_id" TEXT,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "active_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "active_ingredients_therapeutic_class_id_fkey" FOREIGN KEY ("therapeutic_class_id") REFERENCES "therapeutic_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "active_ingredients_normalized_name_key"
  ON "active_ingredients" ("normalized_name");

CREATE INDEX IF NOT EXISTS "active_ingredients_name_idx"
  ON "active_ingredients" ("name");

CREATE TABLE IF NOT EXISTS "drug_products" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "product_name" TEXT NOT NULL,
  "normalized_product_name" TEXT,
  "generic_name" TEXT,
  "tmda_registration_number" TEXT,
  "msd_code" TEXT,
  "brand_id" TEXT,
  "manufacturer_id" TEXT,
  "registrant_id" TEXT,
  "dosage_form_id" TEXT,
  "dosage_form_name" TEXT,
  "route_id" TEXT,
  "pack_size_id" TEXT,
  "therapeutic_class_id" TEXT,
  "primary_source_document_id" TEXT,
  "strength_text" TEXT,
  "pack_size_label" TEXT,
  "storage_condition" TEXT NOT NULL DEFAULT 'AMBIENT',
  "is_cold_chain" BOOLEAN NOT NULL DEFAULT false,
  "is_essential_medicine" BOOLEAN NOT NULL DEFAULT false,
  "registration_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "source_url" TEXT,
  "last_verified_at" TIMESTAMP(3),
  "unit_price" DECIMAL(12,2),
  "category" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drug_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drug_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_registrant_id_fkey" FOREIGN KEY ("registrant_id") REFERENCES "registrants"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_dosage_form_id_fkey" FOREIGN KEY ("dosage_form_id") REFERENCES "dosage_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_pack_size_id_fkey" FOREIGN KEY ("pack_size_id") REFERENCES "pack_sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_therapeutic_class_id_fkey" FOREIGN KEY ("therapeutic_class_id") REFERENCES "therapeutic_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "drug_products_primary_source_document_id_fkey" FOREIGN KEY ("primary_source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'msdCode')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'msd_code') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "msdCode" TO "msd_code";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'name')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'product_name') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "name" TO "product_name";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'genericName')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'generic_name') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "genericName" TO "generic_name";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'dosageForm')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'dosage_form_name') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "dosageForm" TO "dosage_form_name";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'strength')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'strength_text') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "strength" TO "strength_text";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'unitPrice')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'unit_price') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "unitPrice" TO "unit_price";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'isActive')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drug_products' AND column_name = 'is_active') THEN
    ALTER TABLE "drug_products" RENAME COLUMN "isActive" TO "is_active";
  END IF;
END $$;

ALTER TABLE "drug_products"
  ADD COLUMN IF NOT EXISTS "normalized_product_name" TEXT,
  ADD COLUMN IF NOT EXISTS "tmda_registration_number" TEXT,
  ADD COLUMN IF NOT EXISTS "brand_id" TEXT,
  ADD COLUMN IF NOT EXISTS "manufacturer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "registrant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "dosage_form_id" TEXT,
  ADD COLUMN IF NOT EXISTS "dosage_form_name" TEXT,
  ADD COLUMN IF NOT EXISTS "route_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_size_id" TEXT,
  ADD COLUMN IF NOT EXISTS "therapeutic_class_id" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_source_document_id" TEXT,
  ADD COLUMN IF NOT EXISTS "strength_text" TEXT,
  ADD COLUMN IF NOT EXISTS "pack_size_label" TEXT,
  ADD COLUMN IF NOT EXISTS "storage_condition" TEXT NOT NULL DEFAULT 'AMBIENT',
  ADD COLUMN IF NOT EXISTS "is_cold_chain" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_essential_medicine" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "registration_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "drug_products"
SET
  "normalized_product_name" = COALESCE("normalized_product_name", LOWER(COALESCE("product_name", ''))),
  "review_status" = CASE
    WHEN "review_status" = 'DRAFT'::"ReviewStatus" THEN 'IMPORTED'::"ReviewStatus"
    ELSE "review_status"
  END,
  "updated_at" = CURRENT_TIMESTAMP
WHERE TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_master_pkey')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drug_products')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_pkey') THEN
    ALTER TABLE "drug_products" RENAME CONSTRAINT "drug_master_pkey" TO "drug_products_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'drug_master_msdCode_key')
    AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'drug_products_msd_code_key') THEN
    ALTER INDEX "drug_master_msdCode_key" RENAME TO "drug_products_msd_code_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_brand_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_brand_id_fkey"
      FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_manufacturer_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_manufacturer_id_fkey"
      FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_registrant_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_registrant_id_fkey"
      FOREIGN KEY ("registrant_id") REFERENCES "registrants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_dosage_form_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_dosage_form_id_fkey"
      FOREIGN KEY ("dosage_form_id") REFERENCES "dosage_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_route_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_route_id_fkey"
      FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_pack_size_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_pack_size_id_fkey"
      FOREIGN KEY ("pack_size_id") REFERENCES "pack_sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_therapeutic_class_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_therapeutic_class_id_fkey"
      FOREIGN KEY ("therapeutic_class_id") REFERENCES "therapeutic_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_products_primary_source_document_id_fkey') THEN
    ALTER TABLE "drug_products"
      ADD CONSTRAINT "drug_products_primary_source_document_id_fkey"
      FOREIGN KEY ("primary_source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "drug_products_tmda_registration_number_key"
  ON "drug_products" ("tmda_registration_number");

CREATE UNIQUE INDEX IF NOT EXISTS "drug_products_msd_code_key"
  ON "drug_products" ("msd_code");

CREATE INDEX IF NOT EXISTS "drug_products_product_name_idx"
  ON "drug_products" ("product_name");

CREATE INDEX IF NOT EXISTS "drug_products_generic_name_idx"
  ON "drug_products" ("generic_name");

CREATE INDEX IF NOT EXISTS "drug_products_review_status_idx"
  ON "drug_products" ("review_status");

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "drug_product_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_drug_product_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_drug_product_id_fkey"
      FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "products_drug_product_id_idx"
  ON "products" ("drug_product_id");

CREATE TABLE IF NOT EXISTS "drug_product_ingredients" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT NOT NULL,
  "active_ingredient_id" TEXT NOT NULL,
  "strength_id" TEXT,
  "strength_text" TEXT,
  "ingredient_order" INTEGER NOT NULL DEFAULT 1,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drug_product_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drug_product_ingredients_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "drug_product_ingredients_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "drug_product_ingredients_strength_id_fkey" FOREIGN KEY ("strength_id") REFERENCES "strengths"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "drug_product_ingredients_unique_entry"
  ON "drug_product_ingredients" ("drug_product_id", "active_ingredient_id", "ingredient_order");

CREATE INDEX IF NOT EXISTS "drug_product_ingredients_active_ingredient_idx"
  ON "drug_product_ingredients" ("active_ingredient_id");

CREATE TABLE IF NOT EXISTS "product_aliases" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT,
  "brand_id" TEXT,
  "active_ingredient_id" TEXT,
  "source_document_id" TEXT,
  "alias" TEXT NOT NULL,
  "normalized_alias" TEXT NOT NULL,
  "alias_type" "AliasType" NOT NULL DEFAULT 'SPELLING_VARIANT',
  "is_preferred" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_aliases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_aliases_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_aliases_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_aliases_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_aliases_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "product_aliases_normalized_alias_idx"
  ON "product_aliases" ("normalized_alias");

CREATE TABLE IF NOT EXISTS "allergies" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "allergy_type" TEXT NOT NULL DEFAULT 'DRUG',
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "allergies_normalized_name_key"
  ON "allergies" ("normalized_name");

CREATE TABLE IF NOT EXISTS "conditions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conditions_normalized_name_key"
  ON "conditions" ("normalized_name");

CREATE TABLE IF NOT EXISTS "warnings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT,
  "active_ingredient_id" TEXT,
  "drug_database_id" TEXT,
  "source_document_id" TEXT,
  "warning_type" TEXT NOT NULL DEFAULT 'GENERAL',
  "severity" TEXT,
  "message" TEXT NOT NULL,
  "source_section" TEXT,
  "source_url" TEXT,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warnings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warnings_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "warnings_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "warnings_drug_database_id_fkey" FOREIGN KEY ("drug_database_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "warnings_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "warnings_review_status_idx"
  ON "warnings" ("review_status");

CREATE TABLE IF NOT EXISTS "pregnancy_flags" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT,
  "active_ingredient_id" TEXT,
  "drug_database_id" TEXT,
  "source_document_id" TEXT,
  "trimester" TEXT,
  "risk_level" TEXT,
  "message" TEXT NOT NULL,
  "source_section" TEXT,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pregnancy_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pregnancy_flags_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pregnancy_flags_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pregnancy_flags_drug_database_id_fkey" FOREIGN KEY ("drug_database_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pregnancy_flags_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pregnancy_flags_review_status_idx"
  ON "pregnancy_flags" ("review_status");

CREATE TABLE IF NOT EXISTS "lactation_flags" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT,
  "active_ingredient_id" TEXT,
  "drug_database_id" TEXT,
  "source_document_id" TEXT,
  "risk_level" TEXT,
  "message" TEXT NOT NULL,
  "source_section" TEXT,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lactation_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lactation_flags_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lactation_flags_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lactation_flags_drug_database_id_fkey" FOREIGN KEY ("drug_database_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lactation_flags_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lactation_flags_review_status_idx"
  ON "lactation_flags" ("review_status");

CREATE TABLE IF NOT EXISTS "renal_flags" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT,
  "active_ingredient_id" TEXT,
  "drug_database_id" TEXT,
  "source_document_id" TEXT,
  "stage" TEXT,
  "severity" TEXT,
  "message" TEXT NOT NULL,
  "source_section" TEXT,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "renal_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "renal_flags_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renal_flags_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renal_flags_drug_database_id_fkey" FOREIGN KEY ("drug_database_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "renal_flags_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "renal_flags_review_status_idx"
  ON "renal_flags" ("review_status");

CREATE TABLE IF NOT EXISTS "hepatic_flags" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_product_id" TEXT,
  "active_ingredient_id" TEXT,
  "drug_database_id" TEXT,
  "source_document_id" TEXT,
  "stage" TEXT,
  "severity" TEXT,
  "message" TEXT NOT NULL,
  "source_section" TEXT,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hepatic_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hepatic_flags_drug_product_id_fkey" FOREIGN KEY ("drug_product_id") REFERENCES "drug_products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hepatic_flags_active_ingredient_id_fkey" FOREIGN KEY ("active_ingredient_id") REFERENCES "active_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hepatic_flags_drug_database_id_fkey" FOREIGN KEY ("drug_database_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hepatic_flags_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "hepatic_flags_review_status_idx"
  ON "hepatic_flags" ("review_status");

CREATE TABLE IF NOT EXISTS "data_review_queue" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "source_document_id" TEXT,
  "reviewer_type" "ReviewerType",
  "reviewer_user_id" TEXT,
  "pharmacy_id" TEXT,
  "status" "ReviewQueueStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "current_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "proposed_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "notes" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_review_queue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "data_review_queue_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "data_review_queue_entity_idx"
  ON "data_review_queue" ("entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "data_review_queue_status_reviewer_type_idx"
  ON "data_review_queue" ("status", "reviewer_type");

ALTER TABLE "drug_interactions"
  ADD COLUMN IF NOT EXISTS "source_document_id" TEXT,
  ADD COLUMN IF NOT EXISTS "source_section" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "imported_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_interactions_source_document_id_fkey') THEN
    ALTER TABLE "drug_interactions"
      ADD CONSTRAINT "drug_interactions_source_document_id_fkey"
      FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "drug_interactions_review_status_idx"
  ON "drug_interactions" ("review_status");

ALTER TABLE "drug_contraindications"
  ADD COLUMN IF NOT EXISTS "source_document_id" TEXT,
  ADD COLUMN IF NOT EXISTS "source_section" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "review_status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "imported_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drug_contraindications_source_document_id_fkey') THEN
    ALTER TABLE "drug_contraindications"
      ADD CONSTRAINT "drug_contraindications_source_document_id_fkey"
      FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "drug_contraindications_review_status_idx"
  ON "drug_contraindications" ("review_status");
