-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'WHOLESALE_SELLER';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sellingPrice" DOUBLE PRECISION;
