# APOTEKH Network Sync Implementation Plan (Priority A)

## Goal
Retail pharmacies cache and browse APOTEKH wholesaler product catalogues when preparing purchase orders.

## Current State
- StockOrder + StockOrderItem exist for PO creation
- Suppliers are scoped per pharmacy (no cross-pharmacy visibility)
- No mechanism to expose/sync wholesaler catalogues
- No supplier marketplace in PO workflow

## Required Database Schema Changes

### New Models

#### 1. SupplierCatalogue
```sql
model SupplierCatalogue {
  id                    String    @id @default(uuid())
  
  -- Identifies who is selling
  wholesalerId          String    @map("wholesaler_id")  // Pharmacy with type WHOLESALE
  
  -- Identifies who is caching
  retailPharmacyId      String?   @map("retail_pharmacy_id")  // null = public catalogue
  
  -- Sync metadata
  lastSyncedAt          DateTime? @map("last_synced_at")
  syncStatus            String    @default("ACTIVE")  // ACTIVE, OUTDATED, FAILED
  lastSyncError         String?   @map("last_sync_error")
  
  -- Inventory snapshot
  totalItemsAvailable   Int       @default(0) @map("total_items_available")
  
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  
  wholesaler        Pharmacy                     @relation("WholesalerCatalogues", fields: [wholesalerId], references: [id])
  retailPharmacy    Pharmacy?                    @relation("RetailPharmacyCachedCatalogues", fields: [retailPharmacyId], references: [id])
  items             SupplierCatalogueItem[]
  
  @@unique([wholesalerId, retailPharmacyId], map: "supplier_catalogues_wholesaler_retail_key")
  @@index([retailPharmacyId, syncStatus], map: "supplier_catalogues_retail_sync_idx")
  @@map("supplier_catalogues")
}
```

#### 2. SupplierCatalogueItem
```sql
model SupplierCatalogueItem {
  id                    String    @id @default(uuid())
  catalogueId           String    @map("catalogue_id")
  
  -- Product reference (or name if not in APOTEKH system)
  productId             String?   @map("product_id")  // null if external product
  productName           String    @map("product_name")
  genericName           String?   @map("generic_name")
  strength              String?
  dosageForm            String?   @map("dosage_form")
  
  -- Availability & pricing
  quantityAvailable     Int       @map("quantity_available")
  unitPrice             Decimal   @db.Decimal(12, 2)  // Wholesaler's selling price
  minimumOrderQuantity  Int       @default(1) @map("minimum_order_quantity")
  
  -- Batch/expiry info for FEFO
  batchNumber           String?   @map("batch_number")
  expiryDate            DateTime? @map("expiry_date")
  
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  
  catalogue     SupplierCatalogue @relation(fields: [catalogueId], references: [id], onDelete: Cascade)
  product       Product?          @relation("SupplierCatalogueItemProduct", fields: [productId], references: [id], onDelete: SetNull)
  
  @@index([catalogueId], map: "supplier_catalogue_items_catalogue_idx")
  @@index([productName], map: "supplier_catalogue_items_product_name_idx")
  @@map("supplier_catalogue_items")
}
```

### Schema Updates

#### 3. Supplier Model Enhancement
Add field to mark as APOTEKH network wholesaler:
```sql
model Supplier {
  // ... existing fields ...
  
  // New fields
  isApotekNetworkWholesaler Boolean @default(false) @map("is_apotek_network_wholesaler")
  wholesalerPharmacyId      String? @map("wholesaler_pharmacy_id")  // Links to Pharmacy if this is a wholesaler
  
  // ... existing relations ...
  wholesalerPharmacy    Pharmacy?     @relation("WholesalerSuppliers", fields: [wholesalerPharmacyId], references: [id])
}
```

#### 4. Product Model Enhancement
```sql
model Product {
  // ... existing fields ...
  
  // New field for wholesalers
  isWholesaleProduct    Boolean @default(false) @map("is_wholesale_product")  // Can be ordered by other pharmacies
  
  // ... existing relations ...
}
```

## API Endpoints

### 1. List Available APOTEKH Wholesalers
```
GET /api/v1/suppliers/apotekh-wholesalers
Query: region=Arusha (optional)
Response: [{ id, name, licenceNumber, region, catalogueItemCount }]
```

### 2. Sync Supplier Catalogue
```
POST /api/v1/sync/supplier-catalogue/:supplierId
Body: { force: boolean }  // force = re-sync even if recent
Response: { id, wholesalerId, itemCount, lastSyncedAt, syncStatus }

Flow:
- Validate supplier is APOTEKH wholesaler
- Query wholesaler's Product table (isWholesaleProduct = true)
- Create/update SupplierCatalogue record
- Create/update SupplierCatalogueItem records
- Record sync timestamp and status
```

### 3. Get Cached Catalogue
```
GET /api/v1/supplier-catalogues/:catalogueId/items
Query: search=Paracetamol, page=1, limit=20
Response: [{ id, productName, genericName, quantityAvailable, unitPrice, minimumOrderQuantity, expiryDate }]
```

### 4. Get Retail Pharmacy's Cached Catalogues
```
GET /api/v1/my-catalogues
Query: syncStatus=ACTIVE
Response: [{ id, wholesalerId, wholesalerName, itemCount, lastSyncedAt }]
```

## Frontend Changes

### 1. PO Preparation Marketplace
When user clicks "Create Order":
- Show list of cached APOTEKH suppliers
- Option: "Browse specific supplier" or "Search all suppliers"
- Browse supplier's catalogue items
- Click item → auto-populate PO item (name, strength, dosage, min quantity)
- User adjusts quantity and adds to order

### 2. Supplier Management
- New page: "My Suppliers" (cached catalogues)
- Show sync status, last sync date
- Button: "Refresh catalogue" (triggers sync endpoint)
- Option to mark supplier as "hidden" (don't show in marketplace)

## Implementation Order

1. **Schema migration** - Add SupplierCatalogue, SupplierCatalogueItem, update Supplier
2. **Backend sync service** - `supplier-sync.service.ts` with sync logic
3. **Backend API routes** - `/api/v1/sync/*` and `/api/v1/supplier-catalogues/*`
4. **Frontend PO marketplace UI** - Browse suppliers during order creation
5. **Testing** - Integration tests for sync flow

## Key Rules

- **Sync is lazy**: Trigger on-demand when retail pharmacy clicks "Browse supplier"
- **Caching strategy**: Keep catalogue item data for 24-48h before marking OUTDATED
- **Conflict resolution**: If item already in retailer's local Product table, treat as already-ordered
- **FEFO compliance**: Include batch/expiry info in catalogue to guide ordering
- **Lead time tracking**: Later integration with lead time prediction (Priority B)
