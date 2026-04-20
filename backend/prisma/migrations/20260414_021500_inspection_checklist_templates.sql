CREATE TABLE IF NOT EXISTS "inspection_checklist_templates" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "checklist_type" TEXT NOT NULL DEFAULT 'TMDA_STANDARD',
  "category" TEXT NOT NULL,
  "item" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspection_checklist_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inspection_checklist_templates_unique_item" UNIQUE ("checklist_type", "category", "item")
);

INSERT INTO "inspection_checklist_templates" ("checklist_type", "category", "item", "sort_order")
VALUES
  ('TMDA_STANDARD', 'Licensing', 'Valid TMDA premise licence is displayed prominently', 10),
  ('TMDA_STANDARD', 'Licensing', 'Pharmacist-in-charge registration is current and visible', 20),
  ('TMDA_STANDARD', 'Premises', 'Premises are clean, well lit, and structurally sound', 30),
  ('TMDA_STANDARD', 'Premises', 'Restricted access areas are secure and clearly marked', 40),
  ('TMDA_STANDARD', 'Storage', 'Temperature-sensitive medicines are stored within required range', 50),
  ('TMDA_STANDARD', 'Storage', 'Expired and damaged stock is segregated from saleable stock', 60),
  ('TMDA_STANDARD', 'Records', 'Stock cards or electronic movement logs are up to date', 70),
  ('TMDA_STANDARD', 'Records', 'Supplier invoices and batch traceability records are available', 80),
  ('TMDA_STANDARD', 'Operations', 'Standard operating procedures are available to staff', 90),
  ('TMDA_STANDARD', 'Operations', 'Recall and incident response process is documented', 100),
  ('TMDA_STANDARD', 'Safety', 'Fire safety equipment is available and within inspection date', 110),
  ('TMDA_STANDARD', 'Safety', 'Cold-chain contingency and power backup plans are documented', 120)
ON CONFLICT ("checklist_type", "category", "item") DO NOTHING;
