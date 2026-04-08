export declare class AnalyticsService {
    getSummary(pharmacyId: string): Promise<{
        inventory: {
            totalProducts: number;
            totalStockValue: number;
            lowStockCount: number;
            outOfStockCount: number;
            storageBreakdown: {
                AMBIENT: number;
                REFRIGERATED: number;
                FROZEN: number;
            };
            expiryRisk: Record<string, number>;
        };
        movements: {
            periodDays: number;
            counts: {
                received: number;
                dispensed: number;
                adjusted: number;
                damaged: number;
                other: number;
            };
            topDispensed: {
                name: string;
                units: number;
            }[];
        };
        compliance: {
            score: number;
            total: number;
            breakdown: {
                GREEN: number;
                AMBER: number;
                RED: number;
                EXPIRED: number;
            };
        };
    }>;
}
//# sourceMappingURL=analytics.service.d.ts.map