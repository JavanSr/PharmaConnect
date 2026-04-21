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

  await page.getByLabel('Manual barcode entry').fill('990000000001');
  await page.getByRole('button', { name: 'Record barcode' }).click();
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
