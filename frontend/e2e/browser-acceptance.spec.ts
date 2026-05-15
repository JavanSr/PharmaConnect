import { test, expect } from '@playwright/test';
import { bootstrapSession, browserUsers, expectProtectedRoute, mockShell, pharmacies } from './helpers';

test('public deferred page accepts waitlist signup', async ({ page }) => {
  await page.route('**/api/v1/waitlist', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'waitlist-entry',
          email: 'browser@example.com',
          feature: 'NHIF Claims Module',
          confirmationEmail: { sent: false, reason: 'RESEND_NOT_CONFIGURED' },
        },
      }),
    });
  });

  await page.goto('/nhif-claims');

  await expect(page.getByRole('heading', { name: 'NHIF Claims Module' })).toBeVisible();

  await page.getByLabel('Email').fill(`browser-waitlist-${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Save my spot' }).click();

  await expect(page.getByText('You are on the waitlist.')).toBeVisible();
});

test('near-expiry trial shows banner and keeps subscription route reachable', async ({ page }) => {
  await bootstrapSession(page, {
    user: browserUsers.nearTrialOwner,
    pharmacy: pharmacies.nearTrial,
  });
  await mockShell(page, { subscription: pharmacies.nearTrial });

  await expectProtectedRoute(page, '/settings/subscription');
  await expect(page.getByText(/Trial: \d+ days? remaining/)).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Subscription' })).toBeVisible();
});

test('expired trial shows paywall but still allows subscription page', async ({ page }) => {
  await bootstrapSession(page, {
    user: browserUsers.expiredTrialOwner,
    pharmacy: pharmacies.expiredTrial,
  });
  await mockShell(page, {
    subscription: pharmacies.expiredTrial,
    profile: {
      ...browserUsers.expiredTrialOwner,
      pharmacy: pharmacies.expiredTrial,
    },
  });

  await expectProtectedRoute(page, '/settings/profile');
  await expect(page.getByText('Trial ended')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your 14-day trial has ended' })).toBeVisible();

  await page.getByRole('button', { name: 'Open subscription page' }).click();

  await expect(page).toHaveURL(/\/settings\/subscription/);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Subscription' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your 14-day trial has ended' })).toHaveCount(0);
});

test('multi-outlet users can pick a pharmacy and persist the device selection', async ({ page }) => {
  const memberships = [
    {
      id: 'membership-active',
      pharmacyId: pharmacies.active.id,
      role: 'OWNER',
      active: true,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: null,
      selected: true,
      pharmacy: pharmacies.active,
    },
    {
      id: 'membership-near-trial',
      pharmacyId: pharmacies.nearTrial.id,
      role: 'OWNER',
      active: true,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: null,
      selected: false,
      pharmacy: pharmacies.nearTrial,
    },
  ];

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, {
    subscription: pharmacies.active,
    memberships,
  });

  await page.route(`**/api/v1/me/pharmacies/${pharmacies.nearTrial.id}/select`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: 'playwright-access-token-2',
          refreshToken: 'playwright-refresh-token-2',
          pharmacy: pharmacies.nearTrial,
        },
      }),
    });
  });

  await page.goto('/select-pharmacy');

  await expect(page.getByRole('heading', { name: 'Choose the pharmacy you want to work in' })).toBeVisible();
  await expect(page.getByText(pharmacies.nearTrial.name)).toBeVisible();
  await page.getByRole('button', { name: 'Work in this outlet' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  const persistedState = await page.evaluate(() => window.localStorage.getItem('pc-pharmacy'));
  expect(persistedState).toContain(pharmacies.nearTrial.id);
});

test('enterprise analytics shows one-metric compare across selected pharmacies', async ({ page }) => {
  const enterprisePharmacy = {
    ...pharmacies.active,
    id: 'pharmacy-enterprise',
    name: 'Browser E2E Enterprise Outlet',
    subscriptionTier: 'ENTERPRISE',
  };
  const memberships = [
    {
      id: 'membership-enterprise',
      pharmacyId: enterprisePharmacy.id,
      role: 'OWNER',
      active: true,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: null,
      selected: true,
      pharmacy: enterprisePharmacy,
    },
    {
      id: 'membership-secondary',
      pharmacyId: pharmacies.nearTrial.id,
      role: 'OWNER',
      active: true,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: null,
      selected: false,
      pharmacy: { ...pharmacies.nearTrial, subscriptionTier: 'ENTERPRISE' },
    },
  ];
  let comparePayload: Record<string, unknown> | null = null;

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: enterprisePharmacy,
  });
  await mockShell(page, {
    subscription: enterprisePharmacy,
    memberships,
    analyticsFeatures: {
      tier: 'ENTERPRISE',
      historyDays: 365,
      stockout: true,
      benchmark: true,
      forecast: true,
      seasonality: true,
      deadStock: true,
      multiOutletCompare: true,
    },
  });

  await page.route('**/api/v1/analytics/compare', async (route) => {
    comparePayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          metric: 'DISPENSED_UNITS',
          range: '30D',
          labels: [
            { key: '2026-04-20', label: 'Apr 20' },
            { key: '2026-04-21', label: 'Apr 21' },
            { key: '2026-04-22', label: 'Apr 22' },
          ],
          series: [
            {
              pharmacyId: enterprisePharmacy.id,
              pharmacyName: enterprisePharmacy.name,
              values: [
                { key: '2026-04-20', label: 'Apr 20', value: 10 },
                { key: '2026-04-21', label: 'Apr 21', value: 12 },
                { key: '2026-04-22', label: 'Apr 22', value: 8 },
              ],
            },
            {
              pharmacyId: pharmacies.nearTrial.id,
              pharmacyName: pharmacies.nearTrial.name,
              values: [
                { key: '2026-04-20', label: 'Apr 20', value: 7 },
                { key: '2026-04-21', label: 'Apr 21', value: 9 },
                { key: '2026-04-22', label: 'Apr 22', value: 6 },
              ],
            },
          ],
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/analytics');

  await expect(page.getByText('Multi-outlet compare')).toBeVisible();
  await expect(page.getByLabel('Metric')).toHaveValue('DISPENSED_UNITS');
  expect(comparePayload).toEqual({
    metric: 'DISPENSED_UNITS',
    range: '30D',
    pharmacyIds: [enterprisePharmacy.id, pharmacies.nearTrial.id],
  });
});

test('forecasting page shows stockout forecasting and premium insights', async ({ page }) => {
  const premiumPharmacy = {
    ...pharmacies.active,
    id: 'pharmacy-premium',
    name: 'Browser E2E Premium Outlet',
    subscriptionTier: 'PREMIUM',
  };

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: premiumPharmacy,
  });
  await mockShell(page, {
    subscription: premiumPharmacy,
    analyticsFeatures: {
      tier: 'PREMIUM',
      historyDays: 365,
      stockout: true,
      benchmark: true,
      forecast: true,
      seasonality: true,
      deadStock: true,
      multiOutletCompare: false,
    },
  });

  await expectProtectedRoute(page, '/forecasting');

  await expect(page.getByRole('main').getByRole('heading', { name: 'Forecasting' })).toBeVisible();
  await expect(page.getByText('Stockout forecast')).toBeVisible();
  await expect(page.getByText('Paracetamol')).toBeVisible();
  await expect(page.getByText('Seasonality (12 months)')).toBeVisible();
  await expect(page.getByText('Dead stock ranking')).toBeVisible();
});

test('owner can configure dispensing payment methods from settings', async ({ page }) => {
  let savedConfig: Record<string, unknown> | null = null;

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/settings/config/payment.methods', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      savedConfig = body;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            key: 'payment.methods',
            value: body.value,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          key: 'payment.methods',
          value: {
            version: 1,
            methods: [
              { code: 'CASH', type: 'CASH', label: 'Cash', active: true, note: '' },
            ],
          },
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/settings/subscription');

  await expect(page.getByText('Dispensing payment methods')).toBeVisible();
  await expect(page.getByText('Cash always stays enabled for offline fallback.')).toBeVisible();

  await page.getByRole('button', { name: 'Add mobile money' }).click();
  await page.getByLabel('Mobile money name').fill('Airtel Money');
  await page.getByLabel('Mobile money number').fill('+255755000111');
  await page.getByLabel('Cashier note').fill('Use owner till when the network is stable.');
  await page.getByRole('button', { name: 'Active' }).click();
  await page.getByRole('button', { name: 'Save payment methods' }).click();

  await expect(page.getByText('Payment methods saved')).toBeVisible();
  expect(savedConfig).toEqual({
    value: {
      version: 1,
      methods: [
        {
          code: 'CASH',
          type: 'CASH',
          label: 'Cash',
          active: true,
          phoneNumber: '',
          note: 'Always enabled for offline fallback.',
        },
        {
          code: 'AIRTEL_MONEY',
          type: 'MOBILE_MONEY',
          label: 'Airtel Money',
          phoneNumber: '+255755000111',
          active: false,
          note: 'Use owner till when the network is stable.',
        },
      ],
    },
  });
});

test('dispenser is denied on wholesale dashboard in browser flow', async ({ page }) => {
  await bootstrapSession(page, {
    user: browserUsers.activeDispenser,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await expectProtectedRoute(page, '/wholesale');

  await expect(page.getByRole('heading', { name: 'Access is restricted' })).toBeVisible();
  await expect(page.getByText('Your current role does not have access to this workspace.')).toBeVisible();
});

test('wholesale workspace has its own nav and keeps the legacy orders route working', async ({ page }) => {
  const wholesalePharmacy = {
    ...pharmacies.active,
    id: 'pharmacy-wholesale',
    name: 'Browser E2E Wholesale Outlet',
    pharmacyType: 'WHOLESALE',
    subscriptionTier: 'WHOLESALE',
    isHybrid: true,
    hybridAddonActive: true,
  };

  await bootstrapSession(page, {
    user: {
      ...browserUsers.activeOwner,
      role: 'WHOLESALE_MANAGER',
      pharmacyId: wholesalePharmacy.id,
    },
    pharmacy: wholesalePharmacy,
  });
  await mockShell(page, {
    subscription: wholesalePharmacy,
    wholesaleCatalogue: [],
    wholesaleOrders: [],
    wholesaleInvoices: [],
    wholesaleCreditLimits: [],
  });

  await expectProtectedRoute(page, '/wholesale');

  await expect(page.getByText('Wholesale Operations')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Settings' })).toBeVisible();

  await page.getByRole('main').getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/wholesale\/settings/);
  await expect(page.getByRole('heading', { name: 'Wholesale controls stay separate, data stays shared.' })).toBeVisible();

  await page.goto('/orders');
  await expect(page).toHaveURL(/\/wholesale\/orders/);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Wholesale orders' })).toBeVisible();
});

test('wholesale dashboard shows receivables, demand insights, and EFDMS invoice status', async ({ page }) => {
  const wholesalePharmacy = {
    ...pharmacies.active,
    id: 'pharmacy-wholesale-dashboard',
    name: 'Browser E2E Wholesale Dashboard',
    pharmacyType: 'WHOLESALE',
    subscriptionTier: 'WHOLESALE',
    isHybrid: true,
    hybridAddonActive: true,
  };

  await bootstrapSession(page, {
    user: {
      ...browserUsers.activeOwner,
      role: 'WHOLESALE_MANAGER',
      pharmacyId: wholesalePharmacy.id,
    },
    pharmacy: wholesalePharmacy,
  });
  await mockShell(page, {
    subscription: wholesalePharmacy,
    wholesaleCatalogue: [
      {
        catalogueId: 'catalogue-1',
        title: 'Starter catalogue',
        description: 'Main wholesale line',
        sellerPharmacyId: wholesalePharmacy.id,
        productId: 'product-1',
        productName: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        barcode: '111',
        price: 1000,
        effectivePrice: 950,
        tierPrices: { PREMIUM: 950, ENTERPRISE: 900 },
        minOrderQuantity: 1,
        maxOrderQuantity: null,
      },
    ],
    wholesaleOrders: [
      {
        id: 'order-1',
        orderNumber: 'PC-ORD-2026-0001',
        buyerPharmacyId: 'client-1',
        sellerPharmacyId: wholesalePharmacy.id,
        status: 'CONFIRMED',
        items: [{ productId: 'product-1', productName: 'Paracetamol 500mg', genericName: 'Paracetamol', barcode: '111', quantity: 10, unitPrice: 950, lineTotal: 9500 }],
        subtotalAmount: 9500,
        totalAmount: 9500,
        scheduledDeliveryAt: '2026-04-24T09:00:00.000Z',
        deliveryWindowLabel: 'Morning route',
        deliveryNote: 'Deliver before lunch',
        createdAt: '2026-04-22T08:00:00.000Z',
        updatedAt: '2026-04-22T08:00:00.000Z',
      },
    ],
    wholesaleInvoices: [
      {
        id: 'invoice-1',
        orderId: 'order-1',
        invoiceNumber: 'PC-INV-2026-000001',
        pdfPath: '/uploads/vat.pdf',
        subtotalAmount: 9500,
        vatAmount: 1710,
        totalAmount: 11210,
        efdmsStatus: 'STUBBED',
        issuedAt: '2026-04-22T08:30:00.000Z',
      },
    ],
    wholesaleCreditLimits: [
      {
        id: 'credit-1',
        sellerPharmacyId: wholesalePharmacy.id,
        clientPharmacyId: 'client-1',
        clientName: 'Mwanga Clinic',
        creditLimit: 150000,
        outstandingBalance: 64000,
        paymentTermsDays: 21,
        isActive: true,
        blockNewOrders: false,
        blockReason: null,
      },
    ],
  });

  await expectProtectedRoute(page, '/wholesale');

  await expect(page.getByRole('main').getByText('Open receivables', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('Receivables aging', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('Demand insights', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('Paracetamol 500mg', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('EFDMS invoice queue', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('STUBBED', { exact: true })).toBeVisible();
});

test('wholesale settings can save tier pricing and update a credit block', async ({ page }) => {
  const wholesalePharmacy = {
    ...pharmacies.active,
    id: 'pharmacy-wholesale-settings',
    name: 'Browser E2E Wholesale Settings',
    pharmacyType: 'WHOLESALE',
    subscriptionTier: 'WHOLESALE',
    isHybrid: true,
    hybridAddonActive: true,
  };
  let savedCataloguePayload: Record<string, unknown> | null = null;
  let savedCreditPayload: Record<string, unknown> | null = null;

  await bootstrapSession(page, {
    user: {
      ...browserUsers.activeOwner,
      role: 'WHOLESALE_MANAGER',
      pharmacyId: wholesalePharmacy.id,
    },
    pharmacy: wholesalePharmacy,
  });
  await mockShell(page, {
    subscription: wholesalePharmacy,
    inventoryProducts: [
      {
        id: 'product-1',
        pharmacyId: wholesalePharmacy.id,
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol 500mg',
        barcode: '111',
        dosageForm: 'TABLET',
        unitOfMeasure: 'pack',
        drugClass: 'OTC',
        reorderLevel: 1,
        isActive: true,
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ],
    wholesaleCatalogue: [],
    wholesaleCreditLimits: [
      {
        id: 'credit-1',
        sellerPharmacyId: wholesalePharmacy.id,
        clientPharmacyId: 'client-1',
        clientName: 'Mwanga Clinic',
        creditLimit: 150000,
        outstandingBalance: 64000,
        paymentTermsDays: 21,
        isActive: true,
        blockNewOrders: false,
        blockReason: null,
      },
    ],
  });

  await page.route('**/api/v1/b2b/catalogues', async (route) => {
    savedCataloguePayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { catalogueId: 'catalogue-2' } }) });
  });
  await page.route('**/api/v1/b2b/credit-limits/client-1', async (route) => {
    savedCreditPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'credit-1',
          sellerPharmacyId: wholesalePharmacy.id,
          clientPharmacyId: 'client-1',
          clientName: 'Mwanga Clinic',
          creditLimit: 160000,
          outstandingBalance: 64000,
          paymentTermsDays: 30,
          isActive: true,
          blockNewOrders: true,
          blockReason: 'Temporarily paused',
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/wholesale/settings');

  await page.getByLabel('Product').selectOption('product-1');
  await page.getByLabel('Base price').fill('1000');
  await page.getByLabel('Premium price').fill('950');
  await page.getByLabel('Enterprise price').fill('900');
  await page.getByRole('button', { name: 'Save price line' }).click();

  expect(savedCataloguePayload).toEqual({
    title: 'Paracetamol 500mg pricing',
    items: [
      {
        productId: 'product-1',
        price: 1000,
        tierPrices: {
          PREMIUM: 950,
          ENTERPRISE: 900,
        },
      },
    ],
  });

  await page.getByLabel('Credit limit').fill('160000');
  await page.getByLabel('Payment terms (days)').fill('30');
  await page.getByLabel('Block reason').fill('Temporarily paused');
  await page.getByRole('button', { name: 'Allow orders' }).click();
  await page.getByRole('button', { name: 'Save credit rule' }).click();

  expect(savedCreditPayload).toEqual({
    creditLimit: 160000,
    outstandingBalance: 64000,
    paymentTermsDays: 30,
    blockNewOrders: true,
    blockReason: 'Temporarily paused',
  });
});

test('dispensing defaults to walk-in and can search/register patients while offline', async ({ page, context }) => {
  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await expectProtectedRoute(page, '/dispensing');

  await expect(page.getByLabel('Patient name / label')).toHaveValue('Walk-in customer');
  await expect(page.getByText('Walk-in default')).toBeVisible();

  await context.setOffline(true);

  await page.getByLabel('Phone number').fill('0712 345 678');
  await page.getByLabel('Patient name / label').fill('Amina Juma');
  await page.getByRole('button', { name: 'Search/Register' }).click();

  await expect(page.getByText('Patient saved locally for this pharmacy')).toBeVisible();

  await page.getByRole('button', { name: 'Use walk-in' }).click();
  await expect(page.getByLabel('Patient name / label')).toHaveValue('Walk-in customer');

  await page.getByLabel('Phone number').fill('0712345678');
  await page.getByRole('button', { name: 'Search/Register' }).click();

  await expect(page.getByText('Loaded Amina Juma from local patient cache')).toBeVisible();
  await expect(page.getByLabel('Patient name / label')).toHaveValue('Amina Juma');
});

test('daily close requires a note when variance is above TZS 5000', async ({ page }) => {
  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  let attempt = 0;
  await page.route('**/api/v1/dispensing/daily-close', async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'VARIANCE_NOTE_REQUIRED' }),
      });
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'daily-close-1',
          expectedCash: 10000,
          actualCashCounted: 2000,
          discrepancy: -8000,
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/dispensing/daily-close');

  await page.getByLabel('Actual cash counted').fill('2000');
  await page.getByRole('button', { name: 'Record daily close' }).click();
  await expect(page.getByText('Add a note when the cash variance is above TZS 5,000.')).toBeVisible();

  await page.getByLabel('Notes').fill('Till was short after recount.');
  await page.getByRole('button', { name: 'Record daily close' }).click();
  await expect(page.getByText('Daily close recorded')).toBeVisible();
});

test('controlled register and TMDA updates feed render published records', async ({ page }) => {
  await bootstrapSession(page, {
    user: {
      ...browserUsers.activeOwner,
      role: 'PHARMACIST_IN_CHARGE',
    },
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/dispensing/controlled-register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            eventId: 'event-1',
            referenceNumber: 'RX-CTRL-1',
            productId: 'product-1',
            productName: 'Diazepam 5mg',
            drugClass: 'CONTROLLED',
            quantity: 2,
            batchNumber: 'B-77',
            paymentMethod: 'CASH',
            dispensedByName: 'Active Owner',
            createdAt: '2026-04-22T08:00:00.000Z',
          },
        ],
      }),
    });
  });
  await page.route('**/api/v1/knowledge/bulletins', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'bulletin-1',
            title: 'TMDA recall notice',
            body: {},
            isUrgent: true,
            isPublished: true,
            publishedAt: '2026-04-20T00:00:00.000Z',
            createdAt: '2026-04-20T00:00:00.000Z',
          },
        ],
      }),
    });
  });
  await page.route('**/api/v1/knowledge/publications', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'publication-1',
            title: 'TMDA storage guidance',
            description: 'Updated storage expectations for community pharmacies.',
            fileUrl: 'https://example.com/tmda-storage.pdf',
            category: 'Guidance',
            isPublished: true,
            publishedAt: '2026-04-18T00:00:00.000Z',
            createdAt: '2026-04-18T00:00:00.000Z',
          },
        ],
      }),
    });
  });

  await expectProtectedRoute(page, '/controlled-substances');
  await expect(page.getByText('Diazepam 5mg')).toBeVisible();
  await expect(page.getByText('RX-CTRL-1')).toBeVisible();

  await expectProtectedRoute(page, '/tmda-updates');
  await expect(page.getByText('TMDA recall notice')).toBeVisible();
  await expect(page.getByText('TMDA storage guidance')).toBeVisible();
});

test('dispensing hides patient checks until medicine rules trigger them and removes dose prompt', async ({ page }) => {
  const product = {
    id: 'product-amoxicillin',
    name: 'Amoxicillin 500',
    genericName: 'Amoxicillin',
    strength: '500mg',
    dosageForm: 'CAPSULE',
    currentStock: 24,
    sellingPrice: 1500,
  };

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products/suggestions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 10, totalPages: 1 }),
    });
  });

  await page.route('**/api/v1/patient-safety/session-review', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          resolvedDrugs: [{ id: 'drug-amoxicillin', genericName: 'amoxicillin', source: product.id, sourceType: 'product' }],
          interactions: [],
          contraindications: [],
          diagnosisMatches: [],
          ncdHints: [],
          dosageSuggestions: [],
          requiredPatientInputs: [
            { key: 'allergies', label: 'Allergy history', reason: 'amoxicillin needs allergy history.' },
            { key: 'pregnant', label: 'Pregnancy status', reason: 'amoxicillin needs pregnancy screening.' },
          ],
          requiresPicPin: false,
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/dispensing');

  await expect(page.getByLabel('Dose / directions')).toHaveCount(0);
  await expect(page.getByText('Rule-triggered patient checks')).toHaveCount(0);

  await page.getByLabel('Medicine').fill('amox');
  await page.getByRole('button', { name: /Amoxicillin/i }).first().click();
  await page.getByRole('button', { name: 'Add to basket' }).click();

  await expect(page.getByText('Rule-triggered patient checks')).toBeVisible();
  await expect(page.getByText('Allergies')).toBeVisible();
  await expect(page.getByText('Pregnant')).toBeVisible();
});

test('dispensing shows cached AI counselling suggestions when safety rules trigger', async ({ page }) => {
  const product = {
    id: 'product-counselling',
    name: 'Warfarin 5',
    genericName: 'Warfarin',
    strength: '5mg',
    dosageForm: 'TABLET',
    currentStock: 12,
    sellingPrice: 2200,
  };

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 10, totalPages: 1 }),
    });
  });

  await page.route('**/api/v1/patient-safety/session-review', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          resolvedDrugs: [{ id: 'drug-warfarin', genericName: 'warfarin', source: product.id, sourceType: 'product' }],
          interactions: [],
          contraindications: [
            {
              id: 'contra-pregnancy',
              drug: 'warfarin',
              severity: 'MAJOR',
              message: 'Pregnancy category D requires caution.',
              conditionType: 'PREGNANCY',
              conditionValue: 'D',
              requiresPicPin: false,
            },
          ],
          diagnosisMatches: [],
          ncdHints: [],
          dosageSuggestions: [],
          requiredPatientInputs: [
            { key: 'pregnant', label: 'Pregnancy status', reason: 'warfarin needs pregnancy screening.' },
          ],
          requiresPicPin: false,
        },
      }),
    });
  });

  await page.route('**/api/v1/patient-safety/counselling-suggestions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'counselling-1',
            rule: 'Pregnancy category D requires caution.',
            severity: 'MAJOR',
            drug: 'warfarin',
            flags: ['pregnant'],
            suggestionText: 'Severity remains MAJOR. Explain that warfarin has a high-risk rule trigger and advise pharmacist review before continuing.',
            source: 'RULE_TEMPLATE',
            cached: true,
          },
        ],
      }),
    });
  });

  await expectProtectedRoute(page, '/dispensing');

  await page.getByLabel('Medicine').fill('warf');
  await page.getByRole('button', { name: /Warfarin/i }).first().click();
  await page.getByRole('button', { name: 'Add to basket' }).click();

  await expect(page.getByText('AI counselling suggestions')).toBeVisible();
  await expect(page.getByText('Severity remains MAJOR. Explain that warfarin has a high-risk rule trigger')).toBeVisible();
});

test('dose calculator stays off by default and prompts for pediatric weight', async ({ page }) => {
  const product = {
    id: 'product-ibuprofen',
    name: 'Ibuprofen 200',
    genericName: 'Ibuprofen',
    strength: '200mg',
    dosageForm: 'TABLET',
    currentStock: 30,
    sellingPrice: 800,
  };

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 10, totalPages: 1 }),
    });
  });

  await page.route('**/api/v1/patient-safety/session-review', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          resolvedDrugs: [{ id: 'drug-ibuprofen', genericName: 'ibuprofen', source: product.id, sourceType: 'product' }],
          interactions: [],
          contraindications: [],
          diagnosisMatches: [],
          ncdHints: [],
          dosageSuggestions: [],
          requiredPatientInputs: [],
          requiresPicPin: false,
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/dispensing');

  await expect(page.getByRole('button', { name: 'Enable dose calculator' })).toBeVisible();
  await expect(page.getByLabel('Adult dose (mg)')).toHaveCount(0);

  await page.getByLabel('Age (years)').fill('8');
  await page.getByLabel('Medicine').fill('ibu');
  await page.getByRole('button', { name: /Ibuprofen/i }).first().click();
  await page.getByRole('button', { name: 'Add to basket' }).click();

  await expect(page.getByText('Pediatric patient detected without recorded weight.')).toBeVisible();
  await page.getByRole('button', { name: 'Add weight' }).click();
  await expect(page.getByLabel('Weight (kg)')).toBeFocused();

  await page.getByRole('button', { name: 'Enable dose calculator' }).click();
  await expect(page.getByLabel('Adult dose (mg)')).toBeVisible();
});

test('dispensing loads configured payment methods and uses cached options offline', async ({ page }) => {
  let paymentMethodReads = 0;

  await bootstrapSession(page, {
    user: browserUsers.activeDispenser,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/dispensing/payment-methods', async (route) => {
    paymentMethodReads += 1;

    if (paymentMethodReads === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            methods: [
              {
                code: 'CASH',
                label: 'Cash',
                phoneNumber: '',
                note: 'Always enabled for offline fallback.',
                requiresReference: false,
                source: 'config',
              },
              {
                code: 'AIRTEL_MONEY',
                label: 'Airtel Money',
                phoneNumber: '+255755000111',
                note: 'Use owner till when mobile money is selected.',
                requiresReference: true,
                source: 'config',
              },
            ],
          },
        }),
      });
      return;
    }

    await route.abort('internetdisconnected');
  });

  await expectProtectedRoute(page, '/dispensing');

  await page.getByLabel('Payment method').selectOption('AIRTEL_MONEY');
  await expect(page.getByText('Pay to: +255755000111')).toBeVisible();
  await expect(page.getByText('Use owner till when mobile money is selected.')).toBeVisible();
  await expect(page.getByLabel('Payment reference')).toBeVisible();

  await page.goto('/settings/profile');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.goto('/dispensing');

  await page.getByLabel('Payment method').selectOption('AIRTEL_MONEY');
  await expect(page.getByText('Pay to: +255755000111')).toBeVisible();
  await expect(page.getByText(/Using the last cached payment settings while offline/)).toBeVisible();
});

test('dispensing can attach an optional prescription photo from the checkout panel', async ({ page }) => {
  const product = {
    id: 'product-photo-checkout',
    name: 'Paracetamol 500',
    genericName: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'TABLET',
    currentStock: 20,
    sellingPrice: 1200,
  };
  let checkoutContentType = '';

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 10, totalPages: 1 }),
    });
  });

  await page.route('**/api/v1/patient-safety/session-review', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          resolvedDrugs: [{ id: 'drug-paracetamol', genericName: 'paracetamol', source: product.id, sourceType: 'product' }],
          interactions: [],
          contraindications: [],
          diagnosisMatches: [],
          ncdHints: [],
          dosageSuggestions: [],
          requiredPatientInputs: [],
          requiresPicPin: false,
        },
      }),
    });
  });

  await page.route('**/api/v1/dispensing/checkout', async (route) => {
    checkoutContentType = route.request().headers()['content-type'] ?? '';
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'dispensing-photo-1',
          referenceNumber: 'RX-PHOTO-1',
          paymentMethod: 'CASH',
          paymentRef: null,
          prescriptionPhotoPath: 'uploads/prescriptions/rx-photo.jpg',
          subtotalAmount: 1200,
          discountAmount: 0,
          totalAmount: 1200,
          status: 'COMPLETED',
          vfdStatus: 'NOT_ENABLED',
          createdAt: '2026-04-22T10:45:00.000Z',
          itemCount: 1,
          lines: [
            {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              unitPrice: 1200,
              totalAmount: 1200,
              batchNumber: 'B-1',
            },
          ],
          safetyReview: null,
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/dispensing');

  await page.getByLabel('Medicine').fill('para');
  await page.getByRole('button', { name: /Paracetamol/i }).first().click();
  await page.getByRole('button', { name: 'Add to basket' }).click();

  await page.getByLabel('Prescription photo').setInputFiles({
    name: 'prescription.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-image'),
  });
  await expect(page.getByText('prescription.jpg')).toBeVisible();

  await page.getByRole('button', { name: 'Complete dispensing' }).click();

  await expect(page.getByText('Dispensing completed')).toBeVisible();
  expect(checkoutContentType).toContain('multipart/form-data');
});

test('owner can search a dispensing and process a dedicated return flow', async ({ page }) => {
  let eventReads = 0;
  let returnPayload: Record<string, unknown> | null = null;

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/dispensing/events?*', async (route) => {
    eventReads += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: eventReads === 1
          ? [
              {
                id: 'dispensing-return-1',
                referenceNumber: 'RX-RET-1',
                paymentMethod: 'CASH',
                totalAmount: 5000,
                status: 'COMPLETED',
                createdAt: '2026-04-22T11:00:00.000Z',
                updatedAt: '2026-04-22T11:00:00.000Z',
                voidReason: null,
                voidedAt: null,
                itemCount: 2,
              },
            ]
          : [
              {
                id: 'dispensing-return-1',
                referenceNumber: 'RX-RET-1',
                paymentMethod: 'CASH',
                totalAmount: 5000,
                status: 'VOIDED',
                createdAt: '2026-04-22T11:00:00.000Z',
                updatedAt: '2026-04-22T11:06:00.000Z',
                voidReason: 'Customer returned the unopened sale.',
                voidedAt: '2026-04-22T11:06:00.000Z',
                itemCount: 2,
              },
            ],
      }),
    });
  });

  await page.route('**/api/v1/dispensing/returns/dispensing-return-1', async (route) => {
    returnPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'dispensing-return-1',
          referenceNumber: 'RX-RET-1',
          status: 'VOIDED',
          voidReason: 'Customer returned the unopened sale.',
          source: 'RETURN',
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/dispensing/returns');

  await expect(page.getByText('RX-RET-1')).toBeVisible();
  await page.getByRole('button', { name: 'Start return' }).click();
  await page.getByLabel('Return reason').fill('Customer returned the unopened sale.');
  await page.getByRole('button', { name: 'Process return' }).click();

  await expect(page.getByText('Return processed and stock restored')).toBeVisible();
  await expect(page.getByText('Already returned')).toBeVisible();
  expect(returnPayload).toEqual({
    reason: 'Customer returned the unopened sale.',
  });
});

test('dispenser submits a stock adjustment suggestion without direct adjustment controls', async ({ page }) => {
  const product = {
    id: 'product-stock-suggestion',
    name: 'Paracetamol 500',
    genericName: 'Paracetamol',
    brandName: 'Panadol',
    currentStock: 42,
    unitOfMeasure: 'packs',
  };

  await bootstrapSession(page, {
    user: browserUsers.activeDispenser,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 8, totalPages: 1 }),
    });
  });

  await page.route('**/api/v1/inventory/products/product-stock-suggestion', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...product, batches: [] } }),
    });
  });

  await page.route('**/api/v1/inventory/adjustment-suggestions', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'suggestion-1',
          status: 'PENDING',
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/inventory/adjust');

  await expect(page.getByRole('heading', { name: 'Stock Adjustment Suggestion' })).toBeVisible();
  await expect(page.getByLabel('Movement Type *')).toHaveCount(0);

  await page.getByLabel('Product *').fill('para');
  await page.getByRole('button', { name: /Paracetamol/i }).click();
  await page.getByLabel('Quantity delta *').fill('-2');
  await page.getByLabel('Reason *').selectOption('OTHER');
  await page.getByLabel('Note *').fill('Damaged strip identified during shelf count.');
  await page.getByRole('button', { name: 'Submit Suggestion' }).click();

  await expect(page.getByText('Stock adjustment suggestion submitted')).toBeVisible();
});

test('owner reviews a pending stock adjustment suggestion from the queue', async ({ page }) => {
  let reviewPayload: Record<string, unknown> | null = null;
  let suggestionReads = 0;

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/adjustment-suggestions?*', async (route) => {
    suggestionReads += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: suggestionReads === 1
          ? [
              {
                id: 'suggestion-owner-review-1',
                pharmacyId: pharmacies.active.id,
                productId: 'product-stock-suggestion',
                quantityDelta: -3,
                approvedQuantityDelta: null,
                reason: 'COUNT_VARIANCE',
                note: 'Short by three packs after drawer count.',
                photoPath: null,
                status: 'PENDING',
                createdBy: browserUsers.activeDispenser.id,
                reviewedBy: null,
                reviewNote: null,
                createdAt: '2026-04-22T08:00:00.000Z',
                updatedAt: '2026-04-22T08:00:00.000Z',
                reviewedAt: null,
                product: {
                  id: 'product-stock-suggestion',
                  name: 'Paracetamol 500',
                  genericName: 'Paracetamol',
                },
                batch: {
                  id: 'batch-stock-suggestion',
                  batchNumber: 'PC-0422',
                  expiryDate: '2027-01-10T00:00:00.000Z',
                },
                creator: {
                  id: browserUsers.activeDispenser.id,
                  firstName: browserUsers.activeDispenser.firstName,
                  lastName: browserUsers.activeDispenser.lastName,
                },
                reviewer: null,
              },
            ]
          : [],
      }),
    });
  });

  await page.route('**/api/v1/inventory/adjustment-suggestions/suggestion-owner-review-1/review', async (route) => {
    reviewPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'suggestion-owner-review-1',
          status: 'PARTIAL',
          approvedQuantityDelta: -1,
          reviewedBy: browserUsers.activeOwner.id,
          reviewedAt: '2026-04-22T08:05:00.000Z',
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/inventory/adjust');

  await expect(page.getByLabel('Movement Type *')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pending owner review' })).toBeVisible();
  await expect(page.getByText('Short by three packs after drawer count.')).toBeVisible();

  await page.getByLabel('Partial approved delta').fill('-1');
  await page.getByLabel('Review note (optional)').fill('Approve only the confirmed missing pack.');
  await page.getByRole('button', { name: 'Save partial' }).click();

  await expect(page.getByText('Suggestion review saved')).toBeVisible();
  await expect(page.getByText('No pending stock adjustment suggestions right now.')).toBeVisible();
  expect(reviewPayload).toEqual({
    status: 'PARTIAL',
    approvedQuantityDelta: -1,
    reviewNote: 'Approve only the confirmed missing pack.',
  });
});

test('offline stock intake queues locally and flushes to live batches when back online', async ({ page, context }) => {
  const batchNumber = `PW-E2E-${Date.now()}`;
  const syncedBatches: Array<Record<string, unknown>> = [];
  const product = {
    id: 'product-browser-e2e',
    name: 'Browser E2E Paracetamol',
    genericName: 'Paracetamol',
    brandName: 'Browser E2E',
    barcode: '990000000001',
    dosageForm: 'TABLET',
    strength: '500mg',
  };

  await page.addInitScript(() => {
    const fakeRegistration = {
      sync: {
        register: async () => undefined,
      },
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: async () => fakeRegistration,
        getRegistration: async () => fakeRegistration,
        ready: Promise.resolve(fakeRegistration),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  });

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });
  await page.route('**/api/v1/inventory/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 10, totalPages: 1 }),
    });
  });
  await page.route('**/api/v1/inventory/suppliers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.route('**/api/v1/inventory/batches', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      syncedBatches.push({
        id: `batch-${syncedBatches.length + 1}`,
        batchNumber: body.batchNumber,
        expiryDate: body.expiryDate,
        quantityRemaining: body.quantityRemaining,
        purchasePrice: body.purchasePrice,
        product,
      });

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: syncedBatches[syncedBatches.length - 1] }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: syncedBatches, total: syncedBatches.length, page: 1, limit: 50, totalPages: 1 }),
    });
  });

  await expectProtectedRoute(page, '/inventory/receive');

  await expect(page.getByRole('button', { name: 'Scan' })).toBeVisible();
  await page.getByLabel('Product search').fill('para');
  await page.getByRole('button', { name: /Paracetamol/i }).click();
  await expect(page.locator('input[name="productId"]')).toHaveValue(product.id);
  await page.getByLabel('Batch Number').fill(batchNumber);
  await page.getByLabel('Expiry Date').fill('2027-12-31');
  await page.getByLabel('Quantity Received').fill('12');
  await page.getByLabel('Purchase Price (TZS)').fill('900');

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Receive Stock' }).click();

  await expect(page.getByText('Stock saved locally and queued for sync!')).toBeVisible();
  await expect(page.getByText('1 pending write waiting in the local queue.')).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('0 pending writes waiting in the local queue.')).toBeVisible({ timeout: 20_000 });

  await page.goto('/inventory/batches');
  await page.getByPlaceholder('Search by batch number or product name...').fill(batchNumber);

  await expect(page.getByText(batchNumber)).toBeVisible();
});

test('receiving falls back from GS1 barcode detection to a saved product mapping', async ({ page }) => {
  const product = {
    id: 'product-gs1-map',
    name: 'Mapped Product',
    genericName: 'Amoxicillin',
    brandName: 'Mapped Product',
    barcode: null,
    dosageForm: 'CAPSULE',
    strength: '500mg',
  };
  let lookupReads = 0;
  let savedMappingPayload: Record<string, unknown> | null = null;

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [product], total: 1, page: 1, limit: 10, totalPages: 1 }),
    });
  });

  await page.route('**/api/v1/inventory/suppliers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/v1/inventory/barcode-lookup', async (route) => {
    lookupReads += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: lookupReads === 1
          ? {
              barcode: '09506000134352',
              source: 'GS1',
              product: null,
              gs1: {
                gtin: '09506000134352',
                digitalLink: 'https://id.gs1.org/01/09506000134352',
              },
            }
          : {
              barcode: '09506000134352',
              source: 'USER_MAP',
              product,
              gs1: {
                gtin: '09506000134352',
                digitalLink: 'https://id.gs1.org/01/09506000134352',
              },
            },
      }),
    });
  });

  await page.route('**/api/v1/inventory/barcode-mappings', async (route) => {
    savedMappingPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'mapping-1',
          barcode: '09506000134352',
          source: 'USER_MAP',
          product,
        },
      }),
    });
  });

  await expectProtectedRoute(page, '/inventory/receive');

  await page.getByRole('button', { name: 'Scan' }).click();
  await page.getByLabel('Manual barcode entry').fill('09506000134352');
  await page.getByRole('button', { name: 'Record barcode' }).click();

  await expect(page.getByText('GS1 barcode captured')).toBeVisible();
  await page.getByLabel('Product search').fill('amox');
  await page.getByRole('button', { name: /Amoxicillin/i }).click();
  await page.getByRole('button', { name: 'Save barcode mapping' }).click();

  await expect(page.getByText('Saved barcode mapping for Amoxicillin')).toBeVisible();
  expect(savedMappingPayload).toEqual({
    barcode: '09506000134352',
    productId: 'product-gs1-map',
    source: 'USER_MAP',
  });

  await page.getByRole('button', { name: 'Scan' }).click();
  await page.getByLabel('Manual barcode entry').fill('09506000134352');
  await page.getByRole('button', { name: 'Record barcode' }).click();

  await expect(page.locator('input[name="productId"]')).toHaveValue(product.id);
  await expect(page.getByText('Loaded saved mapping for Amoxicillin')).toBeVisible();
});

test('five-drug safety review renders promptly after API response', async ({ page }) => {
  const drugs = [
    { id: 'perf-1', name: 'Amoxicillin 500', genericName: 'amoxicillin', strength: '500mg', dosageForm: 'TABLET' as const, currentStock: 30, sellingPrice: 1000 },
    { id: 'perf-2', name: 'Metformin 500', genericName: 'metformin', strength: '500mg', dosageForm: 'TABLET' as const, currentStock: 30, sellingPrice: 500 },
    { id: 'perf-3', name: 'Atenolol 50', genericName: 'atenolol', strength: '50mg', dosageForm: 'TABLET' as const, currentStock: 30, sellingPrice: 600 },
    { id: 'perf-4', name: 'Omeprazole 20', genericName: 'omeprazole', strength: '20mg', dosageForm: 'CAPSULE' as const, currentStock: 30, sellingPrice: 800 },
    { id: 'perf-5', name: 'Aspirin 75', genericName: 'aspirin', strength: '75mg', dosageForm: 'TABLET' as const, currentStock: 30, sellingPrice: 300 },
  ];

  await bootstrapSession(page, {
    user: browserUsers.activeOwner,
    pharmacy: pharmacies.active,
  });
  await mockShell(page, { subscription: pharmacies.active });

  await page.route('**/api/v1/inventory/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: drugs, total: drugs.length, page: 1, limit: 10, totalPages: 1 }),
    });
  });

  let reviewCallCount = 0;
  await page.route('**/api/v1/patient-safety/session-review', async (route) => {
    reviewCallCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          resolvedDrugs: drugs.slice(0, reviewCallCount).map((d) => ({
            id: `resolved-${d.id}`,
            genericName: d.genericName,
            source: d.id,
            sourceType: 'product',
          })),
          interactions: [],
          contraindications: [],
          diagnosisMatches: [],
          ncdHints: [],
          dosageSuggestions: [],
          requiredPatientInputs: reviewCallCount >= 5
            ? [{ key: 'weight', label: 'Patient weight', reason: 'Aspirin requires weight check.' }]
            : [],
          requiresPicPin: false,
        },
      }),
    });
  });

  await page.route('**/api/v1/patient-safety/counselling-suggestions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await expectProtectedRoute(page, '/dispensing');

  for (const drug of drugs.slice(0, 4)) {
    await page.getByLabel('Medicine').fill(drug.genericName.slice(0, 4));
    await page.getByRole('button', { name: new RegExp(drug.name, 'i') }).click();
    await page.getByRole('button', { name: 'Add to basket' }).click();
  }

  await expect(page.getByText('Rule-triggered patient checks')).not.toBeVisible();

  await page.getByLabel('Medicine').fill('aspi');
  await page.getByRole('button', { name: /Aspirin 75/i }).click();

  const t0 = Date.now();
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.getByText('Rule-triggered patient checks')).toBeVisible({ timeout: 500 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(500);
});
