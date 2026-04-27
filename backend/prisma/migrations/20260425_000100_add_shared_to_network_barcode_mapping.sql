-- Migration: add_shared_to_network_barcode_mapping
-- Adds network-sharing fields to product_barcode_mappings.
--
-- sharedToNetwork: when true, this mapping is returned to ANY pharmacy during
--   barcode lookup (as a NETWORK suggestion, not an exact match). Lets the
--   platform build a shared drug catalog as a network effect — every confirmed
--   scan enriches all pharmacies.
--
-- networkConfirmations: count of times a second pharmacy accepted this mapping
--   without correction. Acts as a data-quality signal; high-confidence mappings
--   (10+ confirmations) can be promoted to the DrugMaster catalog.

ALTER TABLE "product_barcode_mappings"
  ADD COLUMN "shared_to_network"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "network_confirmations"  INTEGER NOT NULL DEFAULT 0;

-- Index for fast cross-pharmacy lookup: find all shared mappings for a barcode
CREATE INDEX "product_barcode_mappings_barcode_shared_idx"
  ON "product_barcode_mappings" ("barcode", "shared_to_network");
