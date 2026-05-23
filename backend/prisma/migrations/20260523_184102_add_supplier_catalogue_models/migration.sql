-- Add new fields to Supplier
ALTER TABLE "suppliers" ADD COLUMN "is_apotek_network_wholesaler" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "suppliers" ADD COLUMN "wholesaler_pharmacy_id" TEXT;

-- Create SupplierCatalogue table
CREATE TABLE "supplier_catalogues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wholesaler_id" TEXT NOT NULL,
    "retail_pharmacy_id" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_sync_error" TEXT,
    "total_items_available" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supplier_catalogues_wholesaler_id_fkey" FOREIGN KEY ("wholesaler_id") REFERENCES "suppliers" ("id") ON DELETE CASCADE,
    CONSTRAINT "supplier_catalogues_retail_pharmacy_id_fkey" FOREIGN KEY ("retail_pharmacy_id") REFERENCES "pharmacies" ("id") ON DELETE CASCADE
);

-- Create SupplierCatalogueItem table
CREATE TABLE "supplier_catalogue_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catalogue_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "generic_name" TEXT,
    "strength" TEXT,
    "dosage_form" TEXT,
    "quantity_available" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "minimum_order_quantity" INTEGER NOT NULL DEFAULT 1,
    "batch_number" TEXT,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supplier_catalogue_items_catalogue_id_fkey" FOREIGN KEY ("catalogue_id") REFERENCES "supplier_catalogues" ("id") ON DELETE CASCADE,
    CONSTRAINT "supplier_catalogue_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX "suppliers_is_apotek_network_wholesaler_idx" ON "suppliers"("is_apotek_network_wholesaler");
CREATE UNIQUE INDEX "supplier_catalogues_wholesaler_retail_key" ON "supplier_catalogues"("wholesaler_id", "retail_pharmacy_id");
CREATE INDEX "supplier_catalogues_retail_sync_idx" ON "supplier_catalogues"("retail_pharmacy_id", "syncStatus");
CREATE INDEX "supplier_catalogue_items_catalogue_idx" ON "supplier_catalogue_items"("catalogue_id");
CREATE INDEX "supplier_catalogue_items_product_name_idx" ON "supplier_catalogue_items"("product_name");

-- Add foreign key for Supplier.wholesaler_pharmacy_id
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_wholesaler_pharmacy_id_fkey" FOREIGN KEY ("wholesaler_pharmacy_id") REFERENCES "pharmacies" ("id") ON DELETE SET NULL;
