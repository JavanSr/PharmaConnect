-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "drugMasterId" TEXT;

-- CreateTable
CREATE TABLE "DrugMaster" (
    "id" TEXT NOT NULL,
    "tmdaRegistrationNumber" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandName" TEXT,
    "manufacturer" TEXT,
    "drugClass" TEXT,
    "dosageForm" TEXT,
    "strength" TEXT,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'units',
    "packSize" INTEGER NOT NULL DEFAULT 1,
    "storageCondition" "StorageCondition" NOT NULL DEFAULT 'AMBIENT',
    "isColdChain" BOOLEAN NOT NULL DEFAULT false,
    "isEssentialMedicine" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrugMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrugMaster_tmdaRegistrationNumber_key" ON "DrugMaster"("tmdaRegistrationNumber");

-- CreateIndex
CREATE INDEX "DrugMaster_genericName_idx" ON "DrugMaster"("genericName");

-- CreateIndex
CREATE INDEX "DrugMaster_tmdaRegistrationNumber_idx" ON "DrugMaster"("tmdaRegistrationNumber");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_drugMasterId_fkey" FOREIGN KEY ("drugMasterId") REFERENCES "DrugMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
