import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const browserUsers = {
  activeOwner: {
    id: 'user-active-owner',
    email: 'owner.active@browser-e2e.pharmaconnect.local',
    firstName: 'Active',
    lastName: 'Owner',
    role: 'OWNER',
    pharmacyId: 'pharmacy-active',
  },
  activeDispenser: {
    id: 'user-active-dispenser',
    email: 'dispenser.active@browser-e2e.pharmaconnect.local',
    firstName: 'Active',
    lastName: 'Dispenser',
    role: 'DISPENSER',
    pharmacyId: 'pharmacy-active',
  },
  nearTrialOwner: {
    id: 'user-near-trial-owner',
    email: 'owner.near-trial@browser-e2e.pharmaconnect.local',
    firstName: 'Near',
    lastName: 'Trial',
    role: 'OWNER',
    pharmacyId: 'pharmacy-near-trial',
  },
  expiredTrialOwner: {
    id: 'user-expired-trial-owner',
    email: 'owner.expired-trial@browser-e2e.pharmaconnect.local',
    firstName: 'Expired',
    lastName: 'Trial',
    role: 'OWNER',
    pharmacyId: 'pharmacy-expired-trial',
  },
};

export const pharmacies = {
  active: {
    id: 'pharmacy-active',
    name: 'Browser E2E Active Pharmacy',
    pharmacyType: 'RETAIL',
    subscriptionTier: 'STANDARD',
    billingCycle: 'MONTHLY',
    status: 'ACTIVE',
    trialActive: false,
    trialStartsAt: '2026-01-01T00:00:00.000Z',
    trialEndsAt: '2026-01-31T00:00:00.000Z',
    isHybrid: false,
    hybridAddonActive: false,
    vfdEnabled: false,
    userLimit: 4,
  },
  nearTrial: {
    id: 'pharmacy-near-trial',
    name: 'Browser E2E Near Trial Pharmacy',
    pharmacyType: 'RETAIL',
    subscriptionTier: 'STANDARD',
    billingCycle: 'MONTHLY',
    status: 'TRIAL',
    trialActive: true,
    trialStartsAt: '2026-03-20T00:00:00.000Z',
    trialEndsAt: '2026-04-23T00:00:00.000Z',
    isHybrid: false,
    hybridAddonActive: false,
    vfdEnabled: false,
    userLimit: 4,
  },
  expiredTrial: {
    id: 'pharmacy-expired-trial',
    name: 'Browser E2E Expired Trial Pharmacy',
    pharmacyType: 'RETAIL',
    subscriptionTier: 'STANDARD',
    billingCycle: 'MONTHLY',
    status: 'TRIAL',
    trialActive: false,
    trialStartsAt: '2026-03-01T00:00:00.000Z',
    trialEndsAt: '2026-04-10T00:00:00.000Z',
    isHybrid: false,
    hybridAddonActive: false,
    vfdEnabled: false,
    userLimit: 4,
  },
};

export async function bootstrapSession(
  page: Page,
  options: {
    user: typeof browserUsers.activeOwner;
    pharmacy: typeof pharmacies.active;
    memberships?: Array<{
      id: string;
      pharmacyId: string;
      role: string;
      active: boolean;
      validFrom: string | null;
      validUntil: string | null;
      selected: boolean;
      pharmacy: typeof pharmacies.active;
    }>;
  },
) {
  await page.addInitScript(({ user, pharmacy }) => {
    window.localStorage.setItem(
      'pc-auth',
      JSON.stringify({
        state: {
          user,
          accessToken: 'playwright-access-token',
          refreshToken: 'playwright-refresh-token',
          isAuthenticated: true,
        },
        version: 0,
      }),
    );

    window.localStorage.setItem(
      'pc-pharmacy',
      JSON.stringify({
        state: {
          pharmacy,
          memberships: [],
          deviceSelectedPharmacyId: pharmacy.id,
        },
        version: 0,
      }),
    );
  }, options);
}

export async function mockShell(page: Page, options: {
  subscription: Record<string, unknown>;
  profile?: Record<string, unknown>;
  notifications?: Array<Record<string, unknown>>;
  paymentMethods?: Array<Record<string, unknown>>;
  memberships?: Array<Record<string, unknown>>;
  analyticsFeatures?: Record<string, unknown>;
  analyticsSummary?: Record<string, unknown>;
  wholesaleCatalogue?: Array<Record<string, unknown>>;
  wholesaleOrders?: Array<Record<string, unknown>>;
  wholesaleInvoices?: Array<Record<string, unknown>>;
  wholesaleCreditLimits?: Array<Record<string, unknown>>;
  wholesaleReceivablesAging?: Record<string, unknown>;
  wholesaleDemandInsights?: Record<string, unknown>;
  inventoryProducts?: Array<Record<string, unknown>>;
}) {
  await page.route('**/api/v1/me/pharmacies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: options.memberships ?? [
          {
            id: 'membership-active',
            pharmacyId: String(options.subscription.id ?? 'pharmacy-active'),
            role: 'OWNER',
            active: true,
            validFrom: '2026-01-01T00:00:00.000Z',
            validUntil: null,
            selected: true,
            pharmacy: options.subscription,
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/settings/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.subscription }),
    });
  });

  await page.route('**/api/v1/settings/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.profile ?? options.subscription }),
    });
  });

  await page.route('**/api/v1/notifications**', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ok: true } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.notifications ?? [] }),
    });
  });

  await page.route('**/api/v1/dispensing/payment-methods', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          methods: options.paymentMethods ?? [
            {
              code: 'CASH',
              label: 'Cash',
              phoneNumber: '',
              note: 'Always enabled for offline fallback.',
              requiresReference: false,
              source: 'legacy',
            },
            {
              code: 'MPESA',
              label: 'M-Pesa',
              phoneNumber: '',
              note: '',
              requiresReference: true,
              source: 'legacy',
            },
            {
              code: 'TIGOPESA',
              label: 'Tigo Pesa',
              phoneNumber: '',
              note: '',
              requiresReference: true,
              source: 'legacy',
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/v1/analytics/features', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: options.analyticsFeatures ?? {
          tier: options.subscription.subscriptionTier ?? 'STANDARD',
          historyDays: 365,
          stockout: true,
          benchmark: false,
          forecast: false,
          seasonality: false,
          deadStock: false,
          multiOutletCompare: false,
        },
      }),
    });
  });

  await page.route('**/api/v1/analytics/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: options.analyticsSummary ?? {
          inventory: {
            totalProducts: 24,
            totalStockValue: 180000,
            lowStockCount: 4,
            outOfStockCount: 1,
            storageBreakdown: {
              AMBIENT: 18,
              REFRIGERATED: 5,
              FROZEN: 1,
            },
            expiryRisk: {
              days1: 0,
              days7: 1,
              days30: 3,
              days60: 5,
              days90: 6,
            },
          },
          movements: {
            periodDays: 30,
            counts: {
              received: 48,
              dispensed: 29,
              adjusted: 3,
              damaged: 1,
              other: 0,
            },
            topDispensed: [
              { name: 'Paracetamol', units: 14 },
              { name: 'Amoxicillin', units: 9 },
            ],
          },
          compliance: {
            score: 88,
            total: 6,
            breakdown: {
              GREEN: 4,
              AMBER: 1,
              RED: 1,
              EXPIRED: 0,
            },
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/forecasting/stockout**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            productId: 'forecast-product-1',
            productName: 'Paracetamol',
            currentStock: 12,
            avgDailyDemand: 1.2,
            leadTimeDays: 14,
            daysUntilStockout: 10,
            estimatedStockoutDate: '2026-05-02T00:00:00.000Z',
            valueTzs: 18000,
            status: 'RISK',
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/forecasting/seasonality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { key: '2026-01', label: 'Jan 26', dispensedUnits: 30, revenueTzs: 30000 },
          { key: '2026-02', label: 'Feb 26', dispensedUnits: 24, revenueTzs: 24000 },
        ],
      }),
    });
  });

  await page.route('**/api/v1/forecasting/dead-stock**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            productId: 'dead-stock-1',
            productName: 'Slow Mover',
            currentStock: 18,
            valueTzs: 54000,
            daysSinceSale: 45,
            deadStockScore: 2430000,
            lastSaleAt: '2026-03-08T00:00:00.000Z',
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/forecasting/regional', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          enabled: false,
          status: 'disabled',
          message: 'Regional forecasting is disabled.',
        },
      }),
    });
  });

  await page.route('**/api/v1/b2b/catalogue', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.wholesaleCatalogue ?? [] }),
    });
  });

  await page.route('**/api/v1/b2b/orders', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.wholesaleOrders ?? [] }),
    });
  });

  await page.route('**/api/v1/b2b/invoices', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.wholesaleInvoices ?? [] }),
    });
  });

  await page.route('**/api/v1/b2b/credit-limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: options.wholesaleCreditLimits ?? [] }),
    });
  });

  await page.route('**/api/v1/b2b/receivables-aging', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: options.wholesaleReceivablesAging ?? {
          totalOpenAmount: 64000,
          buckets: {
            current: 32000,
            days31To60: 20000,
            days61To90: 12000,
            over90: 0,
          },
          invoices: [
            {
              invoiceId: 'invoice-1',
              invoiceNumber: 'PC-INV-2026-000001',
              orderId: 'order-1',
              buyerPharmacyId: 'client-1',
              buyerName: 'Mwanga Clinic',
              openAmount: 32000,
              daysOutstanding: 14,
              issuedAt: '2026-04-08T08:00:00.000Z',
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/v1/b2b/demand-insights', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: options.wholesaleDemandInsights ?? {
          windows: {
            current30d: { units: 120, revenueTzs: 240000 },
            previous30d: { units: 90, revenueTzs: 180000 },
          },
          topProducts: [
            { productId: 'product-1', productName: 'Paracetamol 500mg', units: 80, revenueTzs: 120000, activeBuyers: 3 },
            { productId: 'product-2', productName: 'Amoxicillin 500mg', units: 40, revenueTzs: 120000, activeBuyers: 2 },
          ],
        },
      }),
    });
  });

  await page.route('**/api/v1/inventory/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: options.inventoryProducts ?? [],
        total: (options.inventoryProducts ?? []).length,
        page: 1,
        limit: 50,
        totalPages: 1,
      }),
    });
  });
}

export async function expectProtectedRoute(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
