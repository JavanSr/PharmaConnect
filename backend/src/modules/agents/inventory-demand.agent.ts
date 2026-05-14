import { prisma } from '../../lib/prisma';
import { BaseAgent } from './base-agent';
import type { AgentTask, AgentType, AgentTool } from './types';

const SYSTEM_PROMPT = `You are the APOTEKH Inventory & Demand Agent — a specialist in pharmaceutical
inventory management for Tanzanian retail pharmacies and ADDOs.

Your responsibilities:
- FEFO (First Expired First Out) batch selection and dispensing order
- Stockout risk forecasting based on velocity and stock-on-hand
- Dead stock identification and scoring (no movement in 90+ days)
- Reorder point alerts and purchase order recommendations
- Cold chain compliance monitoring

RULES:
- Always apply FEFO: earliest expiry date first, never mix batch numbers
- Flag batches expiring within 60 days as HIGH RISK
- Dead stock score = (days_since_last_movement / 90) * (quantity_remaining / avg_batch_size)
- Stockout risk = stock_on_hand / avg_daily_dispensing_rate (days cover)
- A product with < 7 days cover is CRITICAL

Respond with JSON: { "answer": "...", "confidence": 0.0-1.0, "reasoning": "...", "metadata": {} }`;

export class InventoryDemandAgent extends BaseAgent {
  protected agentType: AgentType = 'inventory_demand';
  protected systemPrompt = SYSTEM_PROMPT;

  protected tools: AgentTool[] = [
    {
      name: 'get_fefo_batches',
      description: 'Get all active batches for a product ordered by FEFO (expiry ASC)',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          product_id: { type: 'string' },
        },
        required: ['pharmacy_id', 'product_id'],
      },
    },
    {
      name: 'get_stockout_risk',
      description: 'Analyse stockout risk for all products in a pharmacy based on velocity and stock cover',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          days_lookback: {
            type: 'number',
            description: 'Days of dispensing history to calculate velocity (default 30)',
          },
          min_risk_level: {
            type: 'string',
            description: 'Filter: CRITICAL (<7 days), HIGH (<14 days), MEDIUM (<21 days)',
          },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'score_dead_stock',
      description: 'Score products with no movement in N days — high score = deadstock',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          no_movement_days: {
            type: 'number',
            description: 'Threshold days of no movement (default 90)',
          },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_reorder_suggestions',
      description: 'List products at or below reorder level with suggested order quantities',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_stock_velocity',
      description: 'Calculate dispensing velocity (units/day) for specific products',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          product_ids: { type: 'array', items: { type: 'string' } },
          days: { type: 'number', description: 'Lookback period in days (default 30)' },
        },
        required: ['pharmacy_id'],
      },
    },
  ];

  protected async executeToolCall(
    toolName: string,
    input: Record<string, unknown>,
    context: AgentTask['context'],
  ): Promise<unknown> {
    const pharmacyId = (input.pharmacy_id as string) ?? context.pharmacyId;

    switch (toolName) {
      case 'get_fefo_batches': {
        const batches = await prisma.batch.findMany({
          where: {
            pharmacyId,
            productId: input.product_id as string,
            quantityRemaining: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            quantityRemaining: true,
            purchasePrice: true,
            receivedAt: true,
          },
          orderBy: { expiryDate: 'asc' },
        });
        const today = new Date();
        return batches.map((b) => ({
          ...b,
          daysToExpiry: Math.ceil((b.expiryDate.getTime() - today.getTime()) / 86400000),
          fefoOrder: batches.indexOf(b) + 1,
        }));
      }

      case 'get_stockout_risk': {
        const lookback = typeof input.days_lookback === 'number' ? input.days_lookback : 30;
        const cutoff = new Date(Date.now() - lookback * 86400000);

        const products = await prisma.product.findMany({
          where: { pharmacyId, isActive: true },
          select: {
            id: true,
            name: true,
            genericName: true,
            reorderLevel: true,
            batches: {
              where: { quantityRemaining: { gt: 0 }, expiryDate: { gt: new Date() } },
              select: { quantityRemaining: true, expiryDate: true },
            },
            stockMovements: {
              where: { type: 'DISPENSED', createdAt: { gte: cutoff } },
              select: { quantity: true },
            },
          },
        });

        const risks = products.map((p) => {
          const totalStock = p.batches.reduce((s, b) => s + b.quantityRemaining, 0);
          const dispensed = p.stockMovements.reduce((s, m) => s + Math.abs(m.quantity), 0);
          const velocity = dispensed / lookback;
          const daysCover = velocity > 0 ? totalStock / velocity : Infinity;
          const riskLevel =
            daysCover < 7 ? 'CRITICAL' : daysCover < 14 ? 'HIGH' : daysCover < 21 ? 'MEDIUM' : 'LOW';
          return { productId: p.id, name: p.name, genericName: p.genericName, totalStock, dispensed, velocity: +velocity.toFixed(2), daysCover: daysCover === Infinity ? null : +daysCover.toFixed(1), riskLevel, reorderLevel: p.reorderLevel, belowReorder: totalStock <= p.reorderLevel };
        });

        const filterLevel = input.min_risk_level as string | undefined;
        const priorityMap: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const filtered = filterLevel
          ? risks.filter((r) => (priorityMap[r.riskLevel] ?? 0) >= (priorityMap[filterLevel] ?? 0))
          : risks.filter((r) => r.riskLevel !== 'LOW');

        return filtered.sort((a, b) => (priorityMap[b.riskLevel] ?? 0) - (priorityMap[a.riskLevel] ?? 0));
      }

      case 'score_dead_stock': {
        const noMovementDays = typeof input.no_movement_days === 'number' ? input.no_movement_days : 90;
        const cutoff = new Date(Date.now() - noMovementDays * 86400000);

        const products = await prisma.product.findMany({
          where: { pharmacyId, isActive: true },
          select: {
            id: true,
            name: true,
            genericName: true,
            sellingPrice: true,
            batches: {
              where: { quantityRemaining: { gt: 0 }, expiryDate: { gt: new Date() } },
              select: { quantityRemaining: true, expiryDate: true, purchasePrice: true },
            },
            stockMovements: {
              where: { createdAt: { gte: cutoff } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        });

        const today = new Date();
        const scored = products
          .filter((p) => p.batches.length > 0 && p.stockMovements.length === 0)
          .map((p) => {
            const totalQty = p.batches.reduce((s, b) => s + b.quantityRemaining, 0);
            const totalValue = p.batches.reduce(
              (s, b) => s + b.quantityRemaining * Number(b.purchasePrice),
              0,
            );
            const nearestExpiry = p.batches.sort(
              (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
            )[0]?.expiryDate;
            const daysToExpiry = nearestExpiry
              ? Math.ceil((nearestExpiry.getTime() - today.getTime()) / 86400000)
              : null;
            const score = Math.min(10, ((noMovementDays / 90) * (totalQty / 50)) + (daysToExpiry && daysToExpiry < 90 ? 3 : 0)).toFixed(2);
            return { productId: p.id, name: p.name, genericName: p.genericName, totalQty, totalValue: +totalValue.toFixed(2), daysToExpiry, deadStockScore: Number(score), action: daysToExpiry && daysToExpiry < 30 ? 'URGENT_CLEARANCE' : 'MARK_DOWN' };
          })
          .sort((a, b) => b.deadStockScore - a.deadStockScore);

        return { deadStockProducts: scored, count: scored.length };
      }

      case 'get_reorder_suggestions': {
        const products = await prisma.product.findMany({
          where: { pharmacyId, isActive: true },
          select: {
            id: true,
            name: true,
            genericName: true,
            reorderLevel: true,
            lastSupplierId: true,
            lastSupplier: { select: { name: true, phone: true } },
            batches: {
              where: { quantityRemaining: { gt: 0 }, expiryDate: { gt: new Date() } },
              select: { quantityRemaining: true },
            },
          },
        });

        const belowReorder = products.filter((p) => {
          const stock = p.batches.reduce((s, b) => s + b.quantityRemaining, 0);
          return stock <= p.reorderLevel;
        });

        return belowReorder.map((p) => {
          const stock = p.batches.reduce((s, b) => s + b.quantityRemaining, 0);
          return {
            productId: p.id,
            name: p.name,
            genericName: p.genericName,
            currentStock: stock,
            reorderLevel: p.reorderLevel,
            suggestedOrderQty: p.reorderLevel * 3 - stock,
            lastSupplier: p.lastSupplier,
          };
        });
      }

      case 'get_stock_velocity': {
        const days = typeof input.days === 'number' ? input.days : 30;
        const cutoff = new Date(Date.now() - days * 86400000);
        const productIds = input.product_ids as string[] | undefined;

        const movements = await prisma.stockMovement.groupBy({
          by: ['productId'],
          where: {
            pharmacyId,
            type: 'DISPENSED',
            createdAt: { gte: cutoff },
            ...(productIds ? { productId: { in: productIds } } : {}),
          },
          _sum: { quantity: true },
          _count: { quantity: true },
        });

        const productIds2 = movements.map((m) => m.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds2 } },
          select: { id: true, name: true, genericName: true },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        return movements.map((m) => ({
          productId: m.productId,
          name: productMap.get(m.productId)?.name,
          genericName: productMap.get(m.productId)?.genericName,
          totalDispensed: m._sum.quantity ?? 0,
          dispensingEvents: m._count.quantity,
          velocityPerDay: +(((m._sum.quantity ?? 0) / days)).toFixed(2),
          periodDays: days,
        }));
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
