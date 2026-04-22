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
}

export async function expectProtectedRoute(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
