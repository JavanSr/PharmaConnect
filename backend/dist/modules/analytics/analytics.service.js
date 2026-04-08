"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const EXPIRY_THRESHOLDS = [1, 7, 30, 60, 90];
class AnalyticsService {
    async getSummary(pharmacyId) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const products = await prisma_1.prisma.product.findMany({
            where: { pharmacyId, isActive: true },
            include: {
                batches: {
                    where: { pharmacyId },
                    select: { quantityRemaining: true, expiryDate: true },
                },
            },
        });
        const inventory = products.map((product) => ({
            storageCondition: product.storageCondition,
            sellingPrice: product.sellingPrice ?? 0,
            reorderLevel: product.reorderLevel,
            currentStock: product.batches.reduce((sum, batch) => sum + batch.quantityRemaining, 0),
            batches: product.batches,
        }));
        const totalProducts = inventory.length;
        const outOfStockCount = inventory.filter((product) => product.currentStock === 0).length;
        const lowStockCount = inventory.filter((product) => product.currentStock > 0 && product.currentStock <= product.reorderLevel).length;
        const totalStockValue = inventory.reduce((sum, product) => sum + product.currentStock * product.sellingPrice, 0);
        const storageBreakdown = { AMBIENT: 0, REFRIGERATED: 0, FROZEN: 0 };
        for (const product of inventory) {
            storageBreakdown[product.storageCondition]++;
        }
        const expiryRisk = {};
        for (const days of EXPIRY_THRESHOLDS) {
            const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            expiryRisk[`days${days}`] = inventory.reduce((count, product) => count +
                product.batches.filter((batch) => batch.expiryDate <= cutoff && batch.quantityRemaining > 0).length, 0);
        }
        const movements = await prisma_1.prisma.stockMovement.findMany({
            where: { pharmacyId, createdAt: { gte: thirtyDaysAgo } },
            select: {
                type: true,
                quantity: true,
                product: { select: { name: true, genericName: true } },
            },
        });
        const movementCounts = {
            received: 0,
            dispensed: 0,
            adjusted: 0,
            damaged: 0,
            other: 0,
        };
        const dispensedMap = {};
        for (const movement of movements) {
            if (movement.type === client_1.MovementType.RECEIVED)
                movementCounts.received += movement.quantity;
            else if (movement.type === client_1.MovementType.DISPENSED)
                movementCounts.dispensed += movement.quantity;
            else if (movement.type === client_1.MovementType.ADJUSTED)
                movementCounts.adjusted += movement.quantity;
            else if (movement.type === client_1.MovementType.DAMAGED)
                movementCounts.damaged += movement.quantity;
            else
                movementCounts.other += movement.quantity;
            if (movement.type === client_1.MovementType.DISPENSED) {
                const label = movement.product.genericName || movement.product.name;
                dispensedMap[label] = (dispensedMap[label] ?? 0) + movement.quantity;
            }
        }
        const topDispensed = Object.entries(dispensedMap)
            .map(([name, units]) => ({ name, units }))
            .sort((a, b) => b.units - a.units)
            .slice(0, 8);
        const complianceItems = await prisma_1.prisma.complianceItem.findMany({
            where: { pharmacyId },
            select: { status: true, expiryDate: true },
        });
        const complianceBreakdown = { GREEN: 0, AMBER: 0, RED: 0, EXPIRED: 0 };
        for (const item of complianceItems) {
            complianceBreakdown[item.status]++;
        }
        const totalComplianceItems = complianceItems.length || 1;
        const complianceScore = Math.round((complianceBreakdown.GREEN / totalComplianceItems) * 100);
        return {
            inventory: {
                totalProducts,
                totalStockValue: Math.round(totalStockValue),
                lowStockCount,
                outOfStockCount,
                storageBreakdown,
                expiryRisk,
            },
            movements: {
                periodDays: 30,
                counts: movementCounts,
                topDispensed,
            },
            compliance: {
                score: complianceScore,
                total: complianceItems.length,
                breakdown: complianceBreakdown,
            },
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map