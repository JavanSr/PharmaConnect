CREATE TABLE IF NOT EXISTS "adverse_reaction_reports" (
  "id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "reported_by" TEXT NOT NULL,
  "suspected_drug" TEXT NOT NULL,
  "brand_used" TEXT,
  "batch_number" TEXT,
  "reaction" TEXT NOT NULL,
  "onset" TEXT,
  "outcome" TEXT,
  "patient_age_years" INTEGER,
  "patient_sex" TEXT,
  "seriousness" TEXT NOT NULL DEFAULT 'NON_SERIOUS',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "tmda_reference_no" TEXT,
  "submitted_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "adverse_reaction_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "adverse_reaction_reports_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "adverse_reaction_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "adverse_reaction_reports_pharmacy_created_at_idx"
  ON "adverse_reaction_reports"("pharmacy_id", "created_at");

CREATE INDEX IF NOT EXISTS "adverse_reaction_reports_status_idx"
  ON "adverse_reaction_reports"("status");
