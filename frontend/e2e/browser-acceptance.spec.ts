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
  await expect(page.getByRole('heading', { name: 'Your 30-day trial has ended' })).toBeVisible();

  await page.getByRole('button', { name: 'Open subscription page' }).click();

  await expect(page).toHaveURL(/\/settings\/subscription/);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Subscription' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your 30-day trial has ended' })).toHaveCount(0);
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

  await expect(page.getByRole('heading', { name: 'Wholesale access is restricted' })).toBeVisible();
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
  await page.getByLabel('Product search').fill('990000000001');
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
