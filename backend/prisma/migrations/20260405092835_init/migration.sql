-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'CASHIER', 'WHOLESALE_SELLER');

-- CreateEnum
CREATE TYPE "PharmacyType" AS ENUM ('RETAIL', 'ADDO', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "DrugClass" AS ENUM ('OTC', 'PRESCRIPTION', 'CONTROLLED', 'NARCOTIC');

-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'SOLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIVED', 'DISPENSED', 'ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED', 'RETURNED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('LICENCE', 'INSURANCE', 'EQUIPMENT', 'STAFF_CREDENTIAL', 'SAFETY', 'RECORD_KEEPING', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'DUE_SOON', 'OVERDUE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CpdActivityType" AS ENUM ('READING', 'WORKSHOP', 'CONFERENCE', 'ONLINE_COURSE', 'MENTORING', 'AUDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('DRUG_SAFETY', 'REGULATORY', 'CLINICAL', 'BUSINESS', 'TECHNOLOGY', 'CPD', 'GENERAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MPESA', 'TIGOPESA', 'AIRTEL_MONEY', 'HALOPESA', 'INSURANCE');

-- CreateTable
CREATE TABLE "pharmacies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "pharmacyType" "PharmacyType" NOT NULL DEFAULT 'RETAIL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DISPENSER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_master" (
    "id" TEXT NOT NULL,
    "msdCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dosageForm" TEXT,
    "strength" TEXT,
    "unitPrice" DECIMAL(12,2),
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "drug_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "supplierId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ComplianceCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "documentRef" TEXT,
    "isNotApplicable" BOOLEAN NOT NULL DEFAULT false,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'COMPLIANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensings" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "dispensedById" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispensings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensing_items" (
    "id" TEXT NOT NULL,
    "dispensingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "dose" TEXT,
    "icdCode" TEXT,
    "icdDescription" TEXT,
    "counsellingNotes" TEXT,
    CONSTRAINT "dispensing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" JSONB NOT NULL DEFAULT '{}',
    "category" "ArticleCategory" NOT NULL DEFAULT 'GENERAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "readingTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpd_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "CpdActivityType" NOT NULL DEFAULT 'READING',
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "pointsClaimed" INTEGER NOT NULL DEFAULT 1,
    "pointsApproved" INTEGER,
    "certificate" TEXT,
    "sourceArticleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cpd_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_licenceNumber_key" ON "pharmacies"("licenceNumber");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE UNIQUE INDEX "drug_master_msdCode_key" ON "drug_master"("msdCode");
CREATE UNIQUE INDEX "dispensings_referenceNumber_key" ON "dispensings"("referenceNumber");
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_drugMasterId_fkey" FOREIGN KEY ("drugMasterId") REFERENCES "drug_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispensings" ADD CONSTRAINT "dispensings_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispensings" ADD CONSTRAINT "dispensings_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispensing_items" ADD CONSTRAINT "dispensing_items_dispensingId_fkey" FOREIGN KEY ("dispensingId") REFERENCES "dispensings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispensing_items" ADD CONSTRAINT "dispensing_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispensing_items" ADD CONSTRAINT "dispensing_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cpd_activities" ADD CONSTRAINT "cpd_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cpd_activities" ADD CONSTRAINT "cpd_activities_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
