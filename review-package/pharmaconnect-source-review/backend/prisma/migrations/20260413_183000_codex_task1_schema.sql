CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE "SubscriptionTier" AS ENUM ('ADDO', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PharmacyAccountStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'SMS', 'EMAIL', 'WHATSAPP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OrderStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'CONFIRMED',
    'CANCELLED',
    'PACKED',
    'DISPATCHED',
    'DELIVERED',
    'COMPLETED',
    'DISPUTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'OFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DrugClass" AS ENUM ('OTC', 'PRESCRIPTION', 'CONTROLLED', 'NARCOTIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DosageForm" AS ENUM (
    'TABLET',
    'CAPSULE',
    'SYRUP',
    'INJECTION',
    'CREAM',
    'OINTMENT',
    'DROPS',
    'INHALER',
    'SUPPOSITORY',
    'POWDER',
    'SOLUTION',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ComplianceCategory" AS ENUM (
    'LICENCE',
    'INSURANCE',
    'EQUIPMENT',
    'STAFF_CREDENTIAL',
    'SAFETY',
    'RECORD_KEEPING',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ArticleCategory" AS ENUM (
    'DRUG_SAFETY',
    'REGULATORY',
    'CLINICAL',
    'BUSINESS',
    'TECHNOLOGY',
    'CPD',
    'GENERAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'ADDO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'ENTERPRISE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CASHIER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'WHOLESALE_MANAGER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'WHOLESALE_COUNTER_STAFF';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DELIVERY_STAFF';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'TIGO_PESA';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "ComplianceStatus" ADD VALUE IF NOT EXISTS 'GREEN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "ComplianceStatus" ADD VALUE IF NOT EXISTS 'AMBER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "ComplianceStatus" ADD VALUE IF NOT EXISTS 'RED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "ComplianceStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "pharmacies" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "licenceNumber" TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "region" TEXT NOT NULL DEFAULT '',
  "pharmacyType" "PharmacyType" NOT NULL DEFAULT 'RETAIL',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pharmacies_licenceNumber_key" ON "pharmacies"("licenceNumber");

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacyId" TEXT,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'DISPENSER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLogin" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "genericName" TEXT,
  "brandName" TEXT,
  "barcode" TEXT,
  "dosageForm" "DosageForm" NOT NULL DEFAULT 'TABLET',
  "strength" TEXT,
  "unitOfMeasure" TEXT NOT NULL DEFAULT 'unit',
  "drugClass" "DrugClass" NOT NULL DEFAULT 'OTC',
  "description" TEXT,
  "reorderLevel" INTEGER NOT NULL DEFAULT 10,
  "sellingPrice" DECIMAL(12,2),
  "tmda" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "drugMasterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "products_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "suppliers_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "batches" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "productId" TEXT NOT NULL,
  "pharmacyId" TEXT NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "quantityRemaining" INTEGER NOT NULL DEFAULT 0,
  "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "supplierId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "batches_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacyId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "batchId" TEXT,
  "userId" TEXT NOT NULL,
  "type" "MovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "compliance_items" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "ComplianceCategory" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "dueDate" TIMESTAMP(3),
  "renewalDate" TIMESTAMP(3),
  "documentRef" TEXT,
  "isNotApplicable" BOOLEAN NOT NULL DEFAULT false,
  "status" "ComplianceStatus" NOT NULL DEFAULT 'GREEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compliance_items_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "articles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "body" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "category" "ArticleCategory" NOT NULL DEFAULT 'GENERAL',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "authorId" TEXT,
  "readingTimeMinutes" INTEGER NOT NULL DEFAULT 5,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "isSponsored" BOOLEAN NOT NULL DEFAULT false,
  "sponsorName" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "articles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_key" ON "articles"("slug");

CREATE TABLE IF NOT EXISTS "cpd_activities" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "activityType" TEXT NOT NULL DEFAULT 'READING',
  "title" TEXT NOT NULL,
  "provider" TEXT,
  "activityDate" TIMESTAMP(3) NOT NULL,
  "pointsClaimed" INTEGER NOT NULL DEFAULT 1,
  "pointsApproved" INTEGER,
  "certificate" TEXT,
  "sourceArticleId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cpd_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cpd_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cpd_activities_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "pharmacies"
  ADD COLUMN IF NOT EXISTS "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "status" "PharmacyAccountStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN IF NOT EXISTS "trial_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "trial_starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS "is_hybrid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hybrid_addon_active" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hybrid_enabled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "renewal_year" INTEGER NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE))::INTEGER,
  ADD COLUMN IF NOT EXISTS "vfd_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  ADD COLUMN IF NOT EXISTS "user_limit" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "subscription_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "pharmacies"
SET "subscription_tier" = CASE
  WHEN "pharmacyType" = 'WHOLESALE' THEN 'WHOLESALE'::"SubscriptionTier"
  ELSE COALESCE("subscription_tier", 'STANDARD'::"SubscriptionTier")
END;

UPDATE "pharmacies"
SET "user_limit" = CASE "subscription_tier"
  WHEN 'FREE' THEN 1
  WHEN 'ADDO_PLUS' THEN 2
  WHEN 'STANDARD' THEN 4
  WHEN 'PREMIUM' THEN 6
  WHEN 'WHOLESALE' THEN 8
  ELSE 4
END;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "pic_pin_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "last_password_change_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sku" TEXT,
  ADD COLUMN IF NOT EXISTS "tmda_registration_number" TEXT,
  ADD COLUMN IF NOT EXISTS "cold_chain_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "storage_condition" TEXT NOT NULL DEFAULT 'AMBIENT',
  ADD COLUMN IF NOT EXISTS "retail_stock" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "wholesale_stock" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "wholesale_selling_price" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
  ADD COLUMN IF NOT EXISTS "therapeutic_category" TEXT;

ALTER TABLE "compliance_items"
  ADD COLUMN IF NOT EXISTS "licence_type" TEXT,
  ADD COLUMN IF NOT EXISTS "issuing_body" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_number" TEXT,
  ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "role_scope" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "last_alert_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "html_content" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsored_position" INTEGER,
  ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "cpd_activities"
  ADD COLUMN IF NOT EXISTS "renewal_year" INTEGER NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE))::INTEGER,
  ADD COLUMN IF NOT EXISTS "auto_logged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "course_enrolment_id" TEXT;

CREATE TABLE IF NOT EXISTS "sync_conflicts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "conflict_type" TEXT NOT NULL,
  "local_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "server_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolved_by" TEXT,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sync_conflicts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sync_conflicts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "compliance_documents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "compliance_item_id" TEXT NOT NULL,
  "uploaded_by" TEXT,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "storage_bucket" TEXT NOT NULL DEFAULT 'compliance-documents',
  "mime_type" TEXT,
  "file_size_bytes" INTEGER,
  "signed_url_expires_at" TIMESTAMP(3),
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compliance_documents_compliance_item_id_fkey" FOREIGN KEY ("compliance_item_id") REFERENCES "compliance_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "compliance_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "compliance_alerts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "compliance_item_id" TEXT NOT NULL,
  "recipient_user_id" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "days_before_expiry" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "error_message" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compliance_alerts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "compliance_alerts_compliance_item_id_fkey" FOREIGN KEY ("compliance_item_id") REFERENCES "compliance_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "compliance_alerts_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "staff_credentials" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "user_id" TEXT,
  "credential_name" TEXT NOT NULL,
  "credential_number" TEXT,
  "issuing_body" TEXT,
  "issued_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_credentials_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "staff_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "inspection_checklists" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "generated_by" TEXT,
  "checklist_type" TEXT NOT NULL DEFAULT 'TMDA_STANDARD',
  "score_percentage" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "items" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "pdf_path" TEXT,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspection_checklists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inspection_checklists_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inspection_checklists_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "drug_database" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "generic_name" TEXT NOT NULL,
  "brand_names" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "drug_class" TEXT,
  "therapeutic_category" TEXT,
  "standard_adult_dose" TEXT,
  "frequency" TEXT,
  "route" TEXT,
  "paediatric_dose_formula" TEXT,
  "elderly_dose_notes" TEXT,
  "pregnancy_category" TEXT NOT NULL DEFAULT 'NA',
  "breastfeeding_safety" TEXT,
  "elderly_caution" BOOLEAN NOT NULL DEFAULT false,
  "renal_caution" BOOLEAN NOT NULL DEFAULT false,
  "hepatic_caution" BOOLEAN NOT NULL DEFAULT false,
  "ncd_hints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "clinician_reviewed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drug_database_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "drug_interactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_a_id" TEXT NOT NULL,
  "drug_b_id" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "effect_summary" TEXT NOT NULL,
  "management" TEXT,
  "requires_pic_pin" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drug_interactions_drug_a_id_fkey" FOREIGN KEY ("drug_a_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "drug_interactions_drug_b_id_fkey" FOREIGN KEY ("drug_b_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "drug_contraindications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "drug_id" TEXT NOT NULL,
  "condition_type" TEXT NOT NULL,
  "condition_value" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "requires_pic_pin" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "drug_contraindications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drug_contraindications_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drug_database"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "override_log" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "pic_user_id" TEXT NOT NULL,
  "alert_type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "interaction_id" TEXT,
  "contraindication_id" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "override_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "override_log_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "override_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "override_log_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "override_log_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "drug_interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "override_log_contraindication_id_fkey" FOREIGN KEY ("contraindication_id") REFERENCES "drug_contraindications"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE OR REPLACE FUNCTION prevent_override_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'override_log records cannot be deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_delete_override_log ON "override_log";

CREATE TRIGGER no_delete_override_log
BEFORE DELETE ON "override_log"
FOR EACH ROW EXECUTE FUNCTION prevent_override_log_delete();

CREATE TABLE IF NOT EXISTS "dispensing_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "dispensed_by" TEXT NOT NULL,
  "cashier_id" TEXT,
  "reference_number" TEXT NOT NULL,
  "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "payment_reference" TEXT,
  "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount_reason" TEXT,
  "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "items" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "void_reason" TEXT,
  "voided_at" TIMESTAMP(3),
  "voided_by" TEXT,
  "vfd_status" TEXT NOT NULL DEFAULT 'NOT_ENABLED',
  "vfd_reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispensing_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dispensing_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "dispensing_events_dispensed_by_fkey" FOREIGN KEY ("dispensed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "dispensing_events_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "dispensing_events_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE OR REPLACE FUNCTION prevent_dispensing_core_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.items IS DISTINCT FROM NEW.items OR
     OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
     OLD.dispensed_by IS DISTINCT FROM NEW.dispensed_by OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Core dispensing fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_dispensing_core ON "dispensing_events";

CREATE TRIGGER immutable_dispensing_core
BEFORE UPDATE ON "dispensing_events"
FOR EACH ROW EXECUTE FUNCTION prevent_dispensing_core_update();

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "alert_type" TEXT NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_preferences_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "alert_log" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "reference_type" TEXT NOT NULL,
  "alert_type" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "recipient" TEXT,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alert_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "alert_log_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "bulletins" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "title" TEXT NOT NULL,
  "body" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "is_urgent" BOOLEAN NOT NULL DEFAULT false,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bulletins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "publications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "file_url" TEXT NOT NULL,
  "cover_image_url" TEXT,
  "category" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "courses" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "content" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "assessment" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "passing_score" INTEGER NOT NULL DEFAULT 70,
  "cooldown_hours" INTEGER NOT NULL DEFAULT 24,
  "points_awarded" INTEGER NOT NULL DEFAULT 0,
  "is_pc_accredited" BOOLEAN NOT NULL DEFAULT false,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "course_enrolments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "course_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ENROLLED',
  "progress_percentage" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "certificate_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_enrolments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_enrolments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "course_enrolments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "course_enrolments_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cpd_activities_course_enrolment_id_fkey'
  ) THEN
    ALTER TABLE "cpd_activities"
      ADD CONSTRAINT "cpd_activities_course_enrolment_id_fkey"
      FOREIGN KEY ("course_enrolment_id") REFERENCES "course_enrolments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "email_subscribers" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT NOT NULL,
  "unsubscribe_token" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribed_at" TIMESTAMP(3),
  CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wholesale_catalogues" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wholesale_catalogues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_catalogues_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "wholesale_catalogue_pricing" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "catalogue_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "min_order_quantity" INTEGER NOT NULL DEFAULT 1,
  "max_order_quantity" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wholesale_catalogue_pricing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_catalogue_pricing_catalogue_id_fkey" FOREIGN KEY ("catalogue_id") REFERENCES "wholesale_catalogues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wholesale_catalogue_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "order_number" TEXT NOT NULL DEFAULT ('PC-ORD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6))),
  "buyer_pharmacy_id" TEXT NOT NULL,
  "seller_pharmacy_id" TEXT NOT NULL,
  "assigned_picker" TEXT,
  "assigned_driver" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "items" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "submitted_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "packed_at" TIMESTAMP(3),
  "dispatched_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "disputed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_buyer_pharmacy_id_fkey" FOREIGN KEY ("buyer_pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "orders_seller_pharmacy_id_fkey" FOREIGN KEY ("seller_pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "orders_assigned_picker_fkey" FOREIGN KEY ("assigned_picker") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "orders_assigned_driver_fkey" FOREIGN KEY ("assigned_driver") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "client_credit_limits" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "seller_pharmacy_id" TEXT NOT NULL,
  "client_pharmacy_id" TEXT NOT NULL,
  "credit_limit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "outstanding_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_credit_limits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_credit_limits_seller_pharmacy_id_fkey" FOREIGN KEY ("seller_pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_credit_limits_client_pharmacy_id_fkey" FOREIGN KEY ("client_pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "vat_invoices" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "order_id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "pdf_path" TEXT,
  "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vat_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vat_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "daily_closings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "closed_by" TEXT NOT NULL,
  "signed_off_by" TEXT,
  "closing_date" DATE NOT NULL,
  "expected_cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "actual_cash_counted" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discrepancy" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_closings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_closings_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "daily_closings_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "daily_closings_signed_off_by_fkey" FOREIGN KEY ("signed_off_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "staff_attendance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "attendance_date" DATE NOT NULL,
  "clock_in_at" TIMESTAMP(3),
  "clock_out_at" TIMESTAMP(3),
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_attendance_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "staff_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "predictions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT NOT NULL,
  "prediction_type" TEXT NOT NULL,
  "subject_type" TEXT NOT NULL,
  "subject_id" TEXT,
  "horizon_days" INTEGER NOT NULL DEFAULT 30,
  "payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "predictions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "predictions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "signed_up_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "pharmacy_id" TEXT,
  "table_name" TEXT NOT NULL,
  "record_id" TEXT,
  "action" TEXT NOT NULL,
  "acted_by" TEXT,
  "old_data" JSONB,
  "new_data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_log_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "audit_log_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "products_pharmacyId_sku_key" ON "products"("pharmacyId", "sku") WHERE "sku" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_key" ON "courses"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "course_enrolments_course_user_key" ON "course_enrolments"("course_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "email_subscribers_email_key" ON "email_subscribers"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "email_subscribers_unsubscribe_token_key" ON "email_subscribers"("unsubscribe_token");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "orders"("order_number");
CREATE UNIQUE INDEX IF NOT EXISTS "client_credit_limits_seller_client_key" ON "client_credit_limits"("seller_pharmacy_id", "client_pharmacy_id");
CREATE UNIQUE INDEX IF NOT EXISTS "vat_invoices_invoice_number_key" ON "vat_invoices"("invoice_number");
CREATE UNIQUE INDEX IF NOT EXISTS "vat_invoices_order_id_key" ON "vat_invoices"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "daily_closings_pharmacy_date_key" ON "daily_closings"("pharmacy_id", "closing_date");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_user_date_key" ON "staff_attendance"("user_id", "attendance_date");
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_feature_key" ON "waitlist"("email", "feature");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_alert_key" ON "notification_preferences"("user_id", "alert_type");
CREATE UNIQUE INDEX IF NOT EXISTS "dispensing_events_reference_number_key" ON "dispensing_events"("reference_number");
CREATE UNIQUE INDEX IF NOT EXISTS "alert_log_reference_channel_day_key" ON "alert_log" ("reference_id", "channel", ((created_at)::date));
