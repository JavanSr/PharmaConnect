import { MovementType, PaymentMethod, StorageCondition } from '@prisma/client';
export declare const EXPIRY_REPORT_DAY_THRESHOLDS: readonly [1, 7, 30, 60, 90];
export type ExpiryReportDays = (typeof EXPIRY_REPORT_DAY_THRESHOLDS)[number];
export declare const DEFAULT_EXPIRY_REPORT_DAYS: ExpiryReportDays;
export declare function isExpiryReportDays(value: number): value is ExpiryReportDays;
interface ProductFilters {
    lowStock?: boolean;
    nearExpiry?: boolean;
    category?: string;
    search?: string;
}
interface Pagination {
    page: number;
    limit: number;
}
interface BatchFilters {
    expiryFrom?: Date;
    expiryTo?: Date;
}
interface MovementFilters {
    productId?: string;
    type?: MovementType;
    dateFrom?: Date;
    dateTo?: Date;
}
interface DrugMasterFilters {
    search?: string;
    storageCondition?: StorageCondition;
    essential?: boolean;
}
interface RecordMovementData {
    productId: string;
    batchId?: string;
    type: MovementType;
    quantity: number;
    reason?: string;
    notes?: string;
    referenceNumber?: string;
    userId: string;
}
interface CheckoutItemData {
    productId: string;
    quantity: number;
    dose?: string;
    icdCode?: string;
    notes?: string;
    unitPrice?: number;
}
interface CheckoutData {
    items: CheckoutItemData[];
    paymentMethod?: PaymentMethod;
    paymentRef?: string;
    patientId?: string;
    userId: string;
}
interface SyncData {
    products?: Record<string, unknown>[];
    batches?: Record<string, unknown>[];
    movements?: Record<string, unknown>[];
}
export declare class InventoryService {
    listDrugMaster(filters: DrugMasterFilters, pagination: Pagination): Promise<{
        data: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            updatedAt: Date;
            genericName: string;
            brandName: string | null;
            drugClass: string | null;
            dosageForm: string | null;
            strength: string | null;
            unitOfMeasure: string;
            packSize: number;
            storageCondition: import(".prisma/client").$Enums.StorageCondition;
            isColdChain: boolean;
            tmdaRegistrationNumber: string;
            manufacturer: string | null;
            isEssentialMedicine: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    searchDrugMaster(query: string): Promise<{
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        genericName: string;
        brandName: string | null;
        drugClass: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string;
        manufacturer: string | null;
        isEssentialMedicine: boolean;
    }[]>;
    listProducts(pharmacyId: string, filters: ProductFilters, pagination: Pagination): Promise<{
        data: {
            currentStock: number;
            hasNearExpiry: boolean;
            batches: {
                id: string;
                batchNumber: string;
                expiryDate: Date;
                quantityRemaining: number;
                purchasePrice: number;
            }[];
            id: string;
            createdAt: Date;
            name: string;
            pharmacyId: string;
            isActive: boolean;
            updatedAt: Date;
            genericName: string | null;
            brandName: string | null;
            drugClass: string | null;
            description: string | null;
            sku: string | null;
            barcode: string | null;
            dosageForm: string | null;
            strength: string | null;
            unitOfMeasure: string;
            packSize: number;
            storageCondition: import(".prisma/client").$Enums.StorageCondition;
            isColdChain: boolean;
            tmdaRegistrationNumber: string | null;
            sellingPrice: number | null;
            purchasePriceDefault: number | null;
            reorderLevel: number;
            minStock: number;
            drugMasterId: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createProduct(pharmacyId: string, data: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        isActive: boolean;
        updatedAt: Date;
        genericName: string | null;
        brandName: string | null;
        drugClass: string | null;
        description: string | null;
        sku: string | null;
        barcode: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string | null;
        sellingPrice: number | null;
        purchasePriceDefault: number | null;
        reorderLevel: number;
        minStock: number;
        drugMasterId: string | null;
    }>;
    updateProduct(id: string, pharmacyId: string, data: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        isActive: boolean;
        updatedAt: Date;
        genericName: string | null;
        brandName: string | null;
        drugClass: string | null;
        description: string | null;
        sku: string | null;
        barcode: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string | null;
        sellingPrice: number | null;
        purchasePriceDefault: number | null;
        reorderLevel: number;
        minStock: number;
        drugMasterId: string | null;
    }>;
    getProductById(id: string, pharmacyId: string): Promise<({
        batches: {
            id: string;
            pharmacyId: string;
            productId: string;
            batchNumber: string;
            expiryDate: Date;
            quantityRemaining: number;
            purchasePrice: number;
            supplierId: string | null;
            receivedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        isActive: boolean;
        updatedAt: Date;
        genericName: string | null;
        brandName: string | null;
        drugClass: string | null;
        description: string | null;
        sku: string | null;
        barcode: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string | null;
        sellingPrice: number | null;
        purchasePriceDefault: number | null;
        reorderLevel: number;
        minStock: number;
        drugMasterId: string | null;
    }) | null>;
    getProductByBarcode(barcode: string, pharmacyId: string): Promise<({
        batches: {
            id: string;
            pharmacyId: string;
            productId: string;
            batchNumber: string;
            expiryDate: Date;
            quantityRemaining: number;
            purchasePrice: number;
            supplierId: string | null;
            receivedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        isActive: boolean;
        updatedAt: Date;
        genericName: string | null;
        brandName: string | null;
        drugClass: string | null;
        description: string | null;
        sku: string | null;
        barcode: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string | null;
        sellingPrice: number | null;
        purchasePriceDefault: number | null;
        reorderLevel: number;
        minStock: number;
        drugMasterId: string | null;
    }) | null>;
    importProductsCsv(pharmacyId: string, csvBuffer: Buffer): Promise<{
        imported: number;
        errors: {
            row: number;
            error: string;
        }[];
    }>;
    listBatches(pharmacyId: string, filters: BatchFilters): Promise<({
        product: {
            id: string;
            name: string;
            genericName: string | null;
            unitOfMeasure: string;
        };
        supplier: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        pharmacyId: string;
        productId: string;
        batchNumber: string;
        expiryDate: Date;
        quantityRemaining: number;
        purchasePrice: number;
        supplierId: string | null;
        receivedAt: Date;
    })[]>;
    createBatch(pharmacyId: string, data: {
        productId: string;
        batchNumber: string;
        expiryDate: Date;
        quantityRemaining: number;
        purchasePrice: number;
        supplierId?: string;
        userId: string;
    }): Promise<{
        product: {
            id: string;
            name: string;
        };
        supplier: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        pharmacyId: string;
        productId: string;
        batchNumber: string;
        expiryDate: Date;
        quantityRemaining: number;
        purchasePrice: number;
        supplierId: string | null;
        receivedAt: Date;
    }>;
    listMovements(pharmacyId: string, filters: MovementFilters, pagination: Pagination): Promise<{
        data: ({
            user: {
                id: string;
                role: import(".prisma/client").$Enums.UserRole;
                firstName: string;
                lastName: string;
            };
            product: {
                id: string;
                name: string;
                genericName: string | null;
                unitOfMeasure: string;
            };
            batch: {
                id: string;
                batchNumber: string;
                expiryDate: Date;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            pharmacyId: string;
            type: import(".prisma/client").$Enums.MovementType;
            productId: string;
            batchId: string | null;
            quantity: number;
            previousBalance: number;
            newBalance: number;
            referenceNumber: string | null;
            reason: string | null;
            notes: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    recordMovement(pharmacyId: string, data: RecordMovementData): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
        product: {
            id: string;
            name: string;
        };
        batch: {
            id: string;
            batchNumber: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        pharmacyId: string;
        type: import(".prisma/client").$Enums.MovementType;
        productId: string;
        batchId: string | null;
        quantity: number;
        previousBalance: number;
        newBalance: number;
        referenceNumber: string | null;
        reason: string | null;
        notes: string | null;
    }>;
    checkoutCart(pharmacyId: string, data: CheckoutData): Promise<{
        referenceNumber: string;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentRef: string | null;
        patientId: string | null;
        totalAmount: number;
        itemCount: number;
        movements: Record<string, unknown>[];
        createdAt: string;
    }>;
    getStockOnHand(pharmacyId: string): Promise<{
        currentStock: number;
        batches: {
            id: string;
            batchNumber: string;
            expiryDate: Date;
            quantityRemaining: number;
        }[];
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        isActive: boolean;
        updatedAt: Date;
        genericName: string | null;
        brandName: string | null;
        drugClass: string | null;
        description: string | null;
        sku: string | null;
        barcode: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string | null;
        sellingPrice: number | null;
        purchasePriceDefault: number | null;
        reorderLevel: number;
        minStock: number;
        drugMasterId: string | null;
    }[]>;
    getExpiryReport(pharmacyId: string, daysThreshold?: number): Promise<({
        product: {
            id: string;
            name: string;
            genericName: string | null;
            unitOfMeasure: string;
        };
        supplier: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        pharmacyId: string;
        productId: string;
        batchNumber: string;
        expiryDate: Date;
        quantityRemaining: number;
        purchasePrice: number;
        supplierId: string | null;
        receivedAt: Date;
    })[]>;
    getLowStockReport(pharmacyId: string): Promise<{
        currentStock: number;
        batches: {
            id: string;
            batchNumber: string;
            expiryDate: Date;
            quantityRemaining: number;
        }[];
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        isActive: boolean;
        updatedAt: Date;
        genericName: string | null;
        brandName: string | null;
        drugClass: string | null;
        description: string | null;
        sku: string | null;
        barcode: string | null;
        dosageForm: string | null;
        strength: string | null;
        unitOfMeasure: string;
        packSize: number;
        storageCondition: import(".prisma/client").$Enums.StorageCondition;
        isColdChain: boolean;
        tmdaRegistrationNumber: string | null;
        sellingPrice: number | null;
        purchasePriceDefault: number | null;
        reorderLevel: number;
        minStock: number;
        drugMasterId: string | null;
    }[]>;
    getMovementsReport(pharmacyId: string, dateFrom: Date, dateTo: Date): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
        product: {
            id: string;
            name: string;
            genericName: string | null;
        };
        batch: {
            id: string;
            batchNumber: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        pharmacyId: string;
        type: import(".prisma/client").$Enums.MovementType;
        productId: string;
        batchId: string | null;
        quantity: number;
        previousBalance: number;
        newBalance: number;
        referenceNumber: string | null;
        reason: string | null;
        notes: string | null;
    })[]>;
    syncOfflineData(pharmacyId: string, data: SyncData): Promise<{
        products?: {
            synced: number;
            conflicts: number;
        };
        batches?: {
            synced: number;
            conflicts: number;
        };
        movements?: {
            synced: number;
            conflicts: number;
        };
    }>;
}
export default InventoryService;
//# sourceMappingURL=inventory.service.d.ts.map