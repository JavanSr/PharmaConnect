import { prisma } from '../../lib/prisma';
import { BaseAgent } from './base-agent';
import type { AgentTask, AgentType, AgentTool } from './types';

const SYSTEM_PROMPT = `You are the APOTEKH Business Intelligence Agent — a specialist in pharmacy
business analytics, subscription health, and customer success for the APOTEKH platform.

Your responsibilities:
- Churn prediction: identify pharmacies at risk of cancellation based on usage patterns
- Trial conversion: score trial pharmacies on likelihood to convert to paid
- Engagement nudges: craft targeted messages to re-engage low-activity pharmacies
- Revenue trend analysis from dispensing transactions
- Feature adoption analysis across subscription tiers

SCORING MODELS:
Churn Risk Score (0-100):
  - Days since last dispensing event × 2
  - Days since last login (proxy from feature telemetry)
  - Compliance items in RED status × 10
  - Trial expired without conversion × 50
  High risk: score > 60, Medium: 30-60, Low: <30

Trial Conversion Score (0-100):
  - Feature telemetry diversity (unique feature keys used)
  - Dispensing volume in trial period
  - Compliance items tracked
  - Staff members added
  Likely to convert: score > 65

Nudge types: EXPIRY_WARNING, FEATURE_DISCOVERY, RE_ENGAGEMENT, UPGRADE_PROMPT

Respond with JSON: { "answer": "...", "confidence": 0.0-1.0, "reasoning": "...", "metadata": {} }`;

export class BusinessIntelAgent extends BaseAgent {
  protected agentType: AgentType = 'business_intel';
  protected systemPrompt = SYSTEM_PROMPT;

  protected tools: AgentTool[] = [
    {
      name: 'get_pharmacy_metrics',
      description: 'Get feature telemetry and usage metrics for a pharmacy',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          days: { type: 'number', description: 'Lookback period in days (default 30)' },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_trial_status',
      description: 'Get trial and subscription details for a pharmacy',
      input_schema: {
        type: 'object',
        properties: { pharmacy_id: { type: 'string' } },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'assess_churn_risk',
      description: 'Calculate churn risk score for a pharmacy based on engagement signals',
      input_schema: {
        type: 'object',
        properties: { pharmacy_id: { type: 'string' } },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_dispensing_revenue',
      description: 'Analyse dispensing transaction volume and revenue trends',
      input_schema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string' },
          days: { type: 'number', description: 'Lookback period in days (default 30)' },
          group_by: {
            type: 'string',
            description: 'Aggregation: DAY, WEEK, MONTH (default WEEK)',
          },
        },
        required: ['pharmacy_id'],
      },
    },
    {
      name: 'get_platform_cohort',
      description: 'Get aggregate engagement stats across all pharmacies for benchmarking',
      input_schema: {
        type: 'object',
        properties: {
          tier: {
            type: 'string',
            description: 'Filter by subscription tier (optional)',
          },
          status: {
            type: 'string',
            description: 'Filter by account status: TRIAL, ACTIVE, SUSPENDED',
          },
        },
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
      case 'get_pharmacy_metrics': {
        const days = typeof input.days === 'number' ? input.days : 30;
        const cutoff = new Date(Date.now() - days * 86400000);

        const [telemetry, dispensingCount, complianceItems, userCount] = await Promise.all([
          prisma.featureTelemetry.groupBy({
            by: ['featureKey', 'eventType'],
            where: { pharmacyId, createdAt: { gte: cutoff } },
            _count: { id: true },
          }),
          prisma.dispensingTransaction.count({
            where: { pharmacyId, createdAt: { gte: cutoff } },
          }),
          prisma.complianceItem.groupBy({
            by: ['status'],
            where: { pharmacyId },
            _count: { id: true },
          }),
          prisma.user.count({ where: { pharmacyId, isActive: true } }),
        ]);

        const featureKeys = [...new Set(telemetry.map((t) => t.featureKey))];
        const totalEvents = telemetry.reduce((s, t) => s + (t._count.id ?? 0), 0);

        return {
          period: `${days}d`,
          uniqueFeaturesUsed: featureKeys.length,
          totalFeatureEvents: totalEvents,
          featureBreakdown: telemetry,
          dispensingTransactions: dispensingCount,
          complianceStatus: complianceItems,
          activeUsers: userCount,
        };
      }

      case 'get_trial_status': {
        const pharmacy = await prisma.pharmacy.findUnique({
          where: { id: pharmacyId },
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
            billingCycle: true,
            status: true,
            trialActive: true,
            trialStartsAt: true,
            trialEndsAt: true,
            isHybrid: true,
            userLimit: true,
            createdAt: true,
            _count: { select: { users: true, products: true } },
          },
        });

        if (!pharmacy) return { error: 'Pharmacy not found' };

        const today = new Date();
        const daysIntoTrial = pharmacy.trialStartsAt
          ? Math.ceil((today.getTime() - pharmacy.trialStartsAt.getTime()) / 86400000)
          : null;
        const trialDaysRemaining = pharmacy.trialEndsAt
          ? Math.ceil((pharmacy.trialEndsAt.getTime() - today.getTime()) / 86400000)
          : null;

        return {
          ...pharmacy,
          daysIntoTrial,
          trialDaysRemaining,
          isTrialExpired: trialDaysRemaining !== null && trialDaysRemaining < 0,
        };
      }

      case 'assess_churn_risk': {
        const today = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

        const [pharmacy, recentTelemetry, recentDispensing, complianceRedItems] =
          await Promise.all([
            prisma.pharmacy.findUnique({
              where: { id: pharmacyId },
              select: {
                trialActive: true,
                trialEndsAt: true,
                status: true,
                subscriptionTier: true,
              },
            }),
            prisma.featureTelemetry.count({
              where: { pharmacyId, createdAt: { gte: thirtyDaysAgo } },
            }),
            prisma.dispensingTransaction.count({
              where: { pharmacyId, createdAt: { gte: thirtyDaysAgo } },
            }),
            prisma.complianceItem.count({
              where: { pharmacyId, status: { in: ['RED', 'EXPIRED'] } },
            }),
          ]);

        if (!pharmacy) return { error: 'Pharmacy not found' };

        let score = 0;
        const factors: string[] = [];

        if (recentTelemetry === 0) {
          score += 40;
          factors.push('No feature activity in 30 days');
        } else if (recentTelemetry < 10) {
          score += 20;
          factors.push('Very low feature activity');
        }

        if (recentDispensing === 0) {
          score += 30;
          factors.push('No dispensing events in 30 days');
        } else if (recentDispensing < 5) {
          score += 10;
          factors.push('Low dispensing volume');
        }

        if (complianceRedItems > 0) {
          score += complianceRedItems * 5;
          factors.push(`${complianceRedItems} compliance item(s) in RED/EXPIRED status`);
        }

        const trialDaysLeft = pharmacy.trialEndsAt
          ? Math.ceil((pharmacy.trialEndsAt.getTime() - today.getTime()) / 86400000)
          : null;

        if (pharmacy.trialActive && trialDaysLeft !== null && trialDaysLeft < 0) {
          score += 50;
          factors.push('Trial expired without conversion');
        } else if (pharmacy.trialActive && trialDaysLeft !== null && trialDaysLeft <= 3) {
          score += 25;
          factors.push('Trial expiring within 3 days');
        }

        const riskLevel = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

        return {
          pharmacyId,
          churnScore: Math.min(100, score),
          riskLevel,
          factors,
          recommendedAction:
            riskLevel === 'HIGH'
              ? 'Immediate founder outreach required'
              : riskLevel === 'MEDIUM'
                ? 'Schedule check-in call'
                : 'Monitor with automated nudge',
          subscriptionTier: pharmacy.subscriptionTier,
          accountStatus: pharmacy.status,
        };
      }

      case 'get_dispensing_revenue': {
        const days = typeof input.days === 'number' ? input.days : 30;
        const cutoff = new Date(Date.now() - days * 86400000);

        const transactions = await prisma.dispensingTransaction.findMany({
          where: { pharmacyId, createdAt: { gte: cutoff }, status: 'COMPLETED' },
          select: {
            id: true,
            createdAt: true,
            payload: true,
          },
          orderBy: { createdAt: 'asc' },
        });

        const byDay: Record<string, { count: number; revenue: number }> = {};
        for (const tx of transactions) {
          const day = tx.createdAt.toISOString().slice(0, 10);
          if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
          byDay[day].count++;
          const payload = tx.payload as Record<string, unknown>;
          const total = typeof payload.totalAmount === 'number' ? payload.totalAmount : 0;
          byDay[day].revenue += total;
        }

        const series = Object.entries(byDay).map(([date, data]) => ({ date, ...data }));
        const totalRevenue = series.reduce((s, d) => s + d.revenue, 0);
        const totalTransactions = series.reduce((s, d) => s + d.count, 0);

        return {
          period: `${days}d`,
          totalRevenue: +totalRevenue.toFixed(2),
          totalTransactions,
          avgRevenuePerTransaction: totalTransactions > 0 ? +(totalRevenue / totalTransactions).toFixed(2) : 0,
          dailySeries: series,
        };
      }

      case 'get_platform_cohort': {
        const where: Record<string, unknown> = {};
        if (input.tier) where.subscriptionTier = input.tier;
        if (input.status) where.status = input.status;

        const [pharmacies, tierBreakdown, totalDispensing30d] = await Promise.all([
          prisma.pharmacy.count({ where }),
          prisma.pharmacy.groupBy({
            by: ['subscriptionTier', 'status'],
            where,
            _count: { id: true },
          }),
          prisma.dispensingTransaction.count({
            where: {
              createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
              status: 'COMPLETED',
            },
          }),
        ]);

        return {
          totalPharmacies: pharmacies,
          tierBreakdown,
          platformDispensing30d: totalDispensing30d,
          filters: { tier: input.tier, status: input.status },
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
