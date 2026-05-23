import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const outputDir = path.join(rootDir, 'docs', 'screenshots');
const tempDir = path.join(rootDir, 'tmp', 'manual-screenshots-current');
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4173';

const requireFromFrontend = createRequire(path.join(frontendDir, 'package.json'));
const { chromium } = requireFromFrontend('@playwright/test');

const activePharmacy = {
  id: 'pharmacy-active',
  name: 'Amani Community Pharmacy',
  region: 'Dar es Salaam',
  pharmacyType: 'RETAIL',
  subscriptionTier: 'PREMIUM',
  billingCycle: 'MONTHLY',
  status: 'ACTIVE',
  trialActive: false,
  trialStartsAt: '2026-01-01T00:00:00.000Z',
  trialEndsAt: '2026-06-30T00:00:00.000Z',
  isHybrid: false,
  hybridAddonActive: false,
  vfdEnabled: true,
  userLimit: 12,
};

const branchPharmacy = {
  ...activePharmacy,
  id: 'pharmacy-branch',
  name: 'Amani Branch Pharmacy',
  region: 'Dodoma',
  subscriptionTier: 'STANDARD',
};

const wholesalePharmacy = {
  ...activePharmacy,
  id: 'pharmacy-wholesale',
  name: 'Amani Wholesale Depot',
  pharmacyType: 'WHOLESALE',
  subscriptionTier: 'WHOLESALE',
  isHybrid: true,
  hybridAddonActive: true,
};

const users = {
  owner: {
    id: 'user-owner',
    email: 'owner@amani.co.tz',
    firstName: 'Asha',
    lastName: 'Mollel',
    role: 'OWNER',
    pharmacyId: activePharmacy.id,
  },
  pic: {
    id: 'user-pic',
    email: 'pic@amani.co.tz',
    firstName: 'Rehema',
    lastName: 'Kato',
    role: 'PHARMACIST_IN_CHARGE',
    pharmacyId: activePharmacy.id,
  },
  wholesale: {
    id: 'user-wholesale',
    email: 'wholesale@amani.co.tz',
    firstName: 'Daniel',
    lastName: 'Mwita',
    role: 'WHOLESALE_MANAGER',
    pharmacyId: wholesalePharmacy.id,
  },
  superAdmin: {
    id: 'user-founder',
    email: 'founder@apotekh.co.tz',
    firstName: 'Founder',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    pharmacyId: activePharmacy.id,
  },
};

const products = [
  {
    id: 'product-1',
    pharmacyId: activePharmacy.id,
    name: 'Paracetamol 500mg Tablet',
    genericName: 'Paracetamol',
    brandName: 'Panadol',
    sku: 'PCM-500',
    barcode: '6194000000012',
    dosageForm: 'TABLET',
    strength: '500mg',
    unitOfMeasure: 'tablets',
    reorderLevel: 40,
    currentStock: 28,
    totalQuantity: 28,
    sellingPrice: 250,
    purchasePrice: 120,
    tmdaRegistrationNumber: 'TAN 22 H 001',
    storageCondition: 'AMBIENT',
    coldChainRequired: false,
    isColdChain: false,
    drugClass: 'OTC',
    verificationStatus: 'MASTER_CATALOG_MATCHED',
    pendingReview: false,
    isActive: true,
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'product-2',
    pharmacyId: activePharmacy.id,
    name: 'Amoxicillin 500mg Capsule',
    genericName: 'Amoxicillin',
    brandName: 'Amoxil',
    sku: 'AMX-500',
    barcode: '6194000000029',
    dosageForm: 'CAPSULE',
    strength: '500mg',
    unitOfMeasure: 'capsules',
    reorderLevel: 30,
    currentStock: 72,
    totalQuantity: 72,
    sellingPrice: 650,
    purchasePrice: 380,
    tmdaRegistrationNumber: 'TAN 22 H 002',
    storageCondition: 'AMBIENT',
    drugClass: 'PRESCRIPTION',
    verificationStatus: 'MASTER_CATALOG_MATCHED',
    pendingReview: false,
    isActive: true,
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'product-3',
    pharmacyId: activePharmacy.id,
    name: 'Insulin Glargine Pen',
    genericName: 'Insulin glargine',
    brandName: 'Lantus',
    sku: 'INS-GLA',
    barcode: '6194000000036',
    dosageForm: 'INJECTION',
    strength: '100IU/ml',
    unitOfMeasure: 'pens',
    reorderLevel: 10,
    currentStock: 6,
    totalQuantity: 6,
    sellingPrice: 18500,
    purchasePrice: 14200,
    tmdaRegistrationNumber: 'TAN 22 H 003',
    storageCondition: 'REFRIGERATED',
    coldChainRequired: true,
    isColdChain: true,
    drugClass: 'PRESCRIPTION',
    verificationStatus: 'MASTER_CATALOG_MATCHED',
    pendingReview: false,
    isActive: true,
    createdAt: '2026-05-01T08:00:00.000Z',
  },
];

const batches = [
  {
    id: 'batch-1',
    productId: products[0].id,
    product: products[0],
    batchNumber: 'PCM-0426-A',
    expiryDate: '2026-06-20T00:00:00.000Z',
    quantityRemaining: 28,
    purchasePrice: 120,
    supplier: { name: 'MedSupply Tanzania' },
  },
  {
    id: 'batch-2',
    productId: products[2].id,
    product: products[2],
    batchNumber: 'COLD-0526',
    expiryDate: '2026-07-05T00:00:00.000Z',
    quantityRemaining: 6,
    purchasePrice: 14200,
    supplier: { name: 'Cold Chain Medical' },
  },
];

const suppliers = [
  { id: 'supplier-1', name: 'MedSupply Tanzania', contactName: 'Neema Paul', phone: '+255 712 111 222' },
  { id: 'supplier-2', name: 'Cold Chain Medical', contactName: 'Victor John', phone: '+255 713 333 444' },
];

const screenshotTargets = [
  { file: '01-login.png', path: '/login', auth: false, readyText: 'Welcome back', viewport: { width: 1280, height: 838 } },
  { file: '02-select-pharmacy.png', path: '/select-pharmacy', user: users.owner, pharmacy: activePharmacy, selectorMode: true, readyText: 'Choose the pharmacy you want to work in', viewport: { width: 1280, height: 838 } },
  { file: '03-dashboard.png', path: '/dashboard', user: users.owner, pharmacy: activePharmacy, readyText: 'Low Stock Alerts' },
  { file: '04-inventory-dashboard.png', path: '/inventory', user: users.owner, pharmacy: activePharmacy, readyText: 'Low Stock Items' },
  { file: '05-products-list.png', path: '/inventory/products', user: users.owner, pharmacy: activePharmacy, readyText: 'Products' },
  { file: '06-add-product.png', path: '/inventory/products/new', user: users.owner, pharmacy: activePharmacy, readyText: 'Product' },
  { file: '07-drug-catalogue.png', path: '/inventory/drug-master', user: users.owner, pharmacy: activePharmacy, readyText: 'Drug Catalogue' },
  { file: '08-receive-stock.png', path: '/inventory/receive', user: users.owner, pharmacy: activePharmacy, readyText: 'Receive Stock', action: openScanner },
  { file: '09-batch-manager.png', path: '/inventory/batches', user: users.owner, pharmacy: activePharmacy, readyText: 'Batch Manager' },
  { file: '10-stock-adjustment.png', path: '/inventory/adjust', user: users.owner, pharmacy: activePharmacy, readyText: 'Pending owner review' },
  { file: '11-order-preparation.png', path: '/inventory/stock-orders', user: users.owner, pharmacy: activePharmacy, readyText: 'Order Preparation' },
  { file: '12-dispensing.png', path: '/dispensing', user: users.pic, pharmacy: activePharmacy, readyText: 'Dispensing', action: addDispensingItem },
  { file: '13-safety-alerts.png', path: '/dispensing/alerts', user: users.pic, pharmacy: activePharmacy, readyText: 'Safety Alert History' },
  { file: '14-controlled-register.png', path: '/dispensing/controlled-register', user: users.pic, pharmacy: activePharmacy, readyText: 'Controlled Register' },
  { file: '15-compliance.png', path: '/compliance', user: users.owner, pharmacy: activePharmacy, readyText: 'Compliance Tracker' },
  { file: '16-inspection-checklist.png', path: '/compliance/inspection', user: users.owner, pharmacy: activePharmacy, readyText: 'TMDA Inspection Checklist', action: openInspectionChecklist },
  { file: '17-staff-credentials.png', path: '/compliance/staff', user: users.owner, pharmacy: activePharmacy, readyText: 'Staff Credentials' },
  { file: '18-analytics.png', path: '/analytics', user: users.owner, pharmacy: activePharmacy, readyText: 'Analytics' },
  { file: '19-forecasting.png', path: '/forecasting', user: users.owner, pharmacy: activePharmacy, readyText: 'Forecasting' },
  { file: '20-wholesale-dashboard.png', path: '/wholesale', user: users.wholesale, pharmacy: wholesalePharmacy, readyText: 'WHOLESALE OPERATIONS' },
  { file: '21-knowledge-hub.png', path: '/knowledge', user: users.owner, pharmacy: activePharmacy, readyText: 'Knowledge Hub' },
  { file: '22-cpd-tracker.png', path: '/cpd', user: users.owner, pharmacy: activePharmacy, readyText: 'CPD Tracker' },
  { file: '23-team-management.png', path: '/settings/team', user: users.owner, pharmacy: activePharmacy, readyText: 'Team Management' },
  { file: '24-subscription.png', path: '/settings/subscription', user: users.owner, pharmacy: activePharmacy, readyText: 'Subscription' },
  { file: '25-founder-dashboard.png', path: '/founder', user: users.superAdmin, pharmacy: activePharmacy, readyText: 'Founder Dashboard' },
  { file: '26-reports.png', path: '/reports', user: users.owner, pharmacy: activePharmacy, readyText: 'Pharmacy Safety Impact' },
];

function membershipsFor(pharmacy, user, selectorMode = false) {
  if (selectorMode) {
    return [
      {
        id: 'membership-active',
        pharmacyId: activePharmacy.id,
        role: 'OWNER',
        active: true,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: null,
        selected: false,
        pharmacy: activePharmacy,
      },
      {
        id: 'membership-branch',
        pharmacyId: branchPharmacy.id,
        role: 'PHARMACIST_IN_CHARGE',
        active: true,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: null,
        selected: false,
        pharmacy: branchPharmacy,
      },
    ];
  }

  return [
    {
      id: `membership-${pharmacy.id}`,
      pharmacyId: pharmacy.id,
      role: user.role,
      active: true,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: null,
      selected: true,
      pharmacy,
    },
    {
      id: 'membership-branch',
      pharmacyId: branchPharmacy.id,
      role: 'PHARMACIST_IN_CHARGE',
      active: true,
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: null,
      selected: false,
      pharmacy: branchPharmacy,
    },
  ];
}

async function addAuth(context, target) {
  if (target.auth === false) return;
  const user = target.user ?? users.owner;
  const pharmacy = target.pharmacy ?? activePharmacy;
  const memberships = membershipsFor(pharmacy, user, target.selectorMode);
  const deviceSelectedPharmacyId = target.selectorMode ? null : pharmacy.id;

  await context.addInitScript(({ user, pharmacy, memberships, deviceSelectedPharmacyId }) => {
    window.localStorage.setItem('pc-auth', JSON.stringify({
      state: {
        user,
        accessToken: 'manual-screenshot-access-token',
        refreshToken: 'manual-screenshot-refresh-token',
        isAuthenticated: true,
      },
      version: 0,
    }));
    window.localStorage.setItem('pc-pharmacy', JSON.stringify({
      state: {
        pharmacy,
        memberships,
        deviceSelectedPharmacyId,
      },
      version: 0,
    }));
  }, { user, pharmacy, memberships, deviceSelectedPharmacyId });
}

async function setupRoutes(page, target) {
  const user = target.user ?? users.owner;
  const pharmacy = target.pharmacy ?? activePharmacy;
  const memberships = membershipsFor(pharmacy, user, target.selectorMode);

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.includes('/api/v1/')) {
      return route.continue();
    }
    const apiPath = url.pathname.replace(/^\/api\/v1/, '') || '/';
    const method = request.method();

    if (method !== 'GET') {
      return fulfill(route, mutationResponse(apiPath));
    }

    if (apiPath === '/me/pharmacies') return fulfill(route, { data: memberships });
    if (apiPath === '/settings/subscription' || apiPath === '/settings/profile') return fulfill(route, { data: pharmacy });
    if (apiPath === '/notifications') return fulfill(route, { data: [] });
    if (apiPath.startsWith('/settings/config/')) return fulfill(route, settingsConfig(apiPath));
    if (apiPath === '/settings/team') return fulfill(route, { data: teamMembers() });

    if (apiPath.startsWith('/inventory/reports/dashboard-summary')) return fulfill(route, { data: dashboardSummary() });
    if (apiPath.startsWith('/inventory/reports/stock-on-hand')) return fulfill(route, pageResponse(products));
    if (apiPath.startsWith('/inventory/reports/expiry')) return fulfill(route, pageResponse(batches));
    if (apiPath.startsWith('/inventory/reports/low-stock')) return fulfill(route, pageResponse(products.filter((product) => product.currentStock <= product.reorderLevel)));
    if (apiPath.startsWith('/inventory/products/suggestions')) return fulfill(route, pageResponse(products));
    if (apiPath === '/inventory/products' || apiPath.startsWith('/inventory/products?')) return fulfill(route, pageResponse(products));
    if (apiPath.startsWith('/inventory/products/')) return fulfill(route, { data: { ...products[0], batches } });
    if (apiPath === '/inventory/suppliers') return fulfill(route, { data: suppliers });
    if (apiPath === '/inventory/batches') return fulfill(route, pageResponse(batches));
    if (apiPath === '/inventory/drug-master') return fulfill(route, drugMasterResponse());
    if (apiPath === '/inventory/adjustment-suggestions') return fulfill(route, { data: adjustmentSuggestions() });
    if (apiPath === '/inventory/barcode-lookup') return fulfill(route, { data: { barcode: '6194000000012', source: 'USER_MAP', product: products[0] } });

    if (apiPath === '/stock-orders') return fulfill(route, { data: stockOrders() });
    if (apiPath === '/stock-orders/suggestions') return fulfill(route, { data: lowStockSuggestions() });
    if (apiPath.startsWith('/stock-orders/')) return fulfill(route, { data: stockOrders()[0] });

    if (apiPath === '/dispensing/payment-methods') return fulfill(route, paymentMethodsResponse());
    if (apiPath === '/patient-safety/override-log') return fulfill(route, pageResponse(overrideLogs()));
    if (apiPath === '/patient-safety/session-review') return fulfill(route, safetyReviewResponse());
    if (apiPath === '/patient-safety/counselling-suggestions') return fulfill(route, counsellingResponse());
    if (apiPath === '/dispensing/controlled-register') return fulfill(route, { data: controlledRegister() });

    if (apiPath === '/compliance/health-score') return fulfill(route, complianceHealth());
    if (apiPath === '/compliance/items') return fulfill(route, { data: complianceItems() });
    if (apiPath === '/compliance/staff-credentials') return fulfill(route, { data: staffCredentials() });
    if (apiPath === '/compliance/inspection-checklists') return fulfill(route, { data: inspectionChecklistList() });
    if (apiPath.startsWith('/compliance/inspection-checklists/')) return fulfill(route, { data: inspectionChecklist() });

    if (apiPath === '/analytics/overview') return fulfill(route, { data: analyticsOverview() });
    if (apiPath === '/analytics/features') return fulfill(route, { data: analyticsFeatures(pharmacy) });
    if (apiPath === '/analytics/compare') return fulfill(route, analyticsCompare());
    if (apiPath === '/forecasting/stockout') return fulfill(route, { data: stockoutForecast() });
    if (apiPath === '/forecasting/seasonality') return fulfill(route, { data: seasonality() });
    if (apiPath === '/forecasting/dead-stock') return fulfill(route, { data: deadStock() });
    if (apiPath === '/forecasting/regional') return fulfill(route, { data: { enabled: false, status: 'disabled', message: 'Regional forecasting is disabled.' } });

    if (apiPath === '/b2b/catalogue') return fulfill(route, { data: wholesaleCatalogue() });
    if (apiPath === '/b2b/orders') return fulfill(route, { data: wholesaleOrders() });
    if (apiPath === '/b2b/invoices') return fulfill(route, { data: wholesaleInvoices() });
    if (apiPath === '/b2b/credit-limits') return fulfill(route, { data: wholesaleCreditLimits() });
    if (apiPath === '/b2b/receivables-aging') return fulfill(route, { data: receivablesAging() });
    if (apiPath === '/b2b/demand-insights') return fulfill(route, { data: demandInsights() });

    if (apiPath === '/knowledge/articles') return fulfill(route, { data: articles() });
    if (apiPath === '/knowledge/bulletins') return fulfill(route, { data: bulletins() });
    if (apiPath === '/knowledge/publications') return fulfill(route, { data: publications() });
    if (apiPath === '/knowledge/courses') return fulfill(route, { data: courses() });
    if (apiPath === '/cpd/summary') return fulfill(route, { data: cpdSummary() });
    if (apiPath === '/cpd/activities') return fulfill(route, { data: cpdActivities() });

    if (apiPath === '/reports/financial/revenue') return fulfill(route, { data: { totalRevenue: 842000, transactionCount: 128 } });
    if (apiPath === '/reports/benchmarking/peer') return fulfill(route, { data: { available: true, cohortSize: 18, ownRevenue: 842000, averageRevenue: 735000, medianRevenue: 710000 } });
    if (apiPath === '/reports/safety-impact') return fulfill(route, { data: safetyImpact() });

    if (apiPath === '/founder/stats') return fulfill(route, { data: founderStats() });
    if (apiPath === '/founder/registrations') return fulfill(route, { data: founderRegistrations() });

    return fulfill(route, { data: [] });
  });
}

async function fulfill(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function pageResponse(data) {
  return { data, total: data.length, page: 1, limit: 50, totalPages: 1 };
}

function mutationResponse(apiPath) {
  if (apiPath === '/analytics/compare') {
    return analyticsCompare();
  }
  if (apiPath === '/reports/custom-builder') {
    return { data: [{ dimension: 'Cash', value: 530000 }, { dimension: 'M-Pesa', value: 312000 }] };
  }
  if (apiPath === '/patient-safety/session-review') return safetyReviewResponse();
  if (apiPath === '/patient-safety/counselling-suggestions') return counsellingResponse();
  return { data: { ok: true, id: 'mock-response' } };
}

function settingsConfig(apiPath) {
  if (apiPath.includes('payment.methods')) {
    return {
      data: {
        key: 'payment.methods',
        value: {
          methods: [
            { code: 'CASH', label: 'Cash', type: 'CASH', enabled: true, requiresReference: false, phoneNumber: '', note: 'Always available.' },
            { code: 'MPESA', label: 'M-Pesa', type: 'MOBILE_MONEY', enabled: true, requiresReference: true, phoneNumber: '+255764591374', note: 'Use owner till for mobile payments.' },
          ],
        },
      },
    };
  }
  return { data: { value: { enabled: true } } };
}

function dashboardSummary() {
  return {
    totalProducts: products.length,
    lowStockCount: 2,
    expiryCount: 2,
    lowStockProducts: products.filter((product) => product.currentStock <= product.reorderLevel),
    expiryBatches: batches,
    recentMovements: [
      { id: 'move-1', type: 'RECEIVED', productName: 'Paracetamol 500mg Tablet', quantity: 80, createdAt: '2026-05-14T09:00:00.000Z' },
      { id: 'move-2', type: 'DISPENSED', productName: 'Amoxicillin 500mg Capsule', quantity: 12, createdAt: '2026-05-14T11:00:00.000Z' },
    ],
    today: {
      revenue: 186500,
      dispensed: 34,
      received: 2,
      adjustments: 1,
      events: 4,
      revenueLast7Days: [
        { date: '2026-05-09', revenue: 125000 },
        { date: '2026-05-10', revenue: 142000 },
        { date: '2026-05-11', revenue: 156000 },
        { date: '2026-05-12', revenue: 148000 },
        { date: '2026-05-13', revenue: 172000 },
        { date: '2026-05-14', revenue: 181000 },
        { date: '2026-05-15', revenue: 186500 },
      ],
    },
  };
}

function drugMasterResponse() {
  const data = products.map((product, index) => ({
    id: `master-${index + 1}`,
    tmdaRegistrationNumber: product.tmdaRegistrationNumber,
    genericName: product.genericName,
    brandName: product.brandName,
    manufacturer: index === 0 ? 'Zenufa Laboratories' : 'Curated Manufacturer',
    drugClass: product.drugClass,
    dosageForm: product.dosageForm,
    strength: product.strength,
    unitOfMeasure: product.unitOfMeasure,
    packSize: 10,
    storageCondition: product.storageCondition,
    isColdChain: product.isColdChain,
    isEssentialMedicine: true,
  }));
  return { success: true, data, meta: { total: data.length, page: 1, limit: 25, totalPages: 1 } };
}

function adjustmentSuggestions() {
  return [
    {
      id: 'suggestion-1',
      pharmacyId: activePharmacy.id,
      productId: products[0].id,
      quantityDelta: -3,
      approvedQuantityDelta: null,
      reason: 'COUNT_VARIANCE',
      note: 'Short by three packs after drawer count.',
      photoPath: null,
      status: 'PENDING',
      createdBy: users.pic.id,
      reviewedBy: null,
      reviewNote: null,
      createdAt: '2026-05-14T08:00:00.000Z',
      updatedAt: '2026-05-14T08:00:00.000Z',
      reviewedAt: null,
      product: products[0],
      batch: batches[0],
      creator: users.pic,
      reviewer: null,
    },
  ];
}

function lowStockSuggestions() {
  return products
    .filter((product) => product.currentStock <= product.reorderLevel)
    .map((product) => ({ ...product, suggestedQuantity: 120, lastSupplierId: suppliers[0].id }));
}

function stockOrders() {
  return [
    {
      id: 'order-1',
      orderNumber: 'PO-2026-0007',
      supplierSummary: 'MedSupply Tanzania',
      itemCount: 2,
      expectedBy: '2026-05-22T00:00:00.000Z',
      status: 'SUBMITTED',
      notes: 'Restock fast-moving lines before weekend.',
      createdAt: '2026-05-14T08:00:00.000Z',
      items: [
        { id: 'order-item-1', productId: products[0].id, productName: products[0].name, genericName: products[0].genericName, quantityOrdered: 120, expectedUnitCost: 120, supplierId: suppliers[0].id },
        { id: 'order-item-2', productId: products[2].id, productName: products[2].name, genericName: products[2].genericName, quantityOrdered: 12, expectedUnitCost: 14200, supplierId: suppliers[1].id },
      ],
    },
  ];
}

function paymentMethodsResponse() {
  return {
    data: {
      methods: [
        { code: 'CASH', label: 'Cash', phoneNumber: '', note: 'Always enabled for offline fallback.', requiresReference: false, source: 'config' },
        { code: 'MPESA', label: 'M-Pesa', phoneNumber: '+255764591374', note: 'Use owner till for mobile payments.', requiresReference: true, source: 'config' },
      ],
    },
  };
}

function safetyReviewResponse() {
  return {
    data: {
      resolvedDrugs: [{ id: 'resolved-amoxicillin', genericName: 'amoxicillin', source: products[1].id, sourceType: 'product' }],
      interactions: [],
      contraindications: [],
      diagnosisMatches: [],
      ncdHints: [],
      dosageSuggestions: [],
      requiredPatientInputs: [
        { key: 'allergies', label: 'Allergy history', reason: 'Amoxicillin needs allergy history.' },
        { key: 'pregnant', label: 'Pregnancy status', reason: 'Amoxicillin needs pregnancy screening.' },
      ],
      requiresPicPin: false,
    },
  };
}

function counsellingResponse() {
  return {
    data: [
      {
        id: 'counselling-1',
        rule: 'Allergy history required',
        severity: 'MODERATE',
        drug: 'amoxicillin',
        flags: ['allergies'],
        suggestionText: 'Confirm allergy history and counsel the patient to stop medication and return if rash or swelling appears.',
        source: 'RULE_TEMPLATE',
        cached: true,
      },
    ],
  };
}

function overrideLogs() {
  return [
    {
      id: 'override-1',
      alertType: 'MAJOR_CONTRAINDICATION',
      reason: 'PIC reviewed allergy history and approved dispensing with counselling.',
      createdAt: '2026-05-14T10:30:00.000Z',
      user: users.pic,
      picUser: users.owner,
    },
  ];
}

function controlledRegister() {
  return [
    {
      eventId: 'event-1',
      referenceNumber: 'RX-CTRL-1',
      productId: 'product-controlled',
      productName: 'Diazepam 5mg',
      drugClass: 'CONTROLLED',
      quantity: 2,
      batchNumber: 'DZP-0526',
      paymentMethod: 'CASH',
      dispensedByName: 'Rehema Kato',
      createdAt: '2026-05-14T08:00:00.000Z',
    },
  ];
}

function complianceHealth() {
  return { data: { score: 86, breakdown: { GREEN: 5, AMBER: 2, RED: 1, EXPIRED: 0 } } };
}

function complianceItems() {
  return [
    { id: 'comp-1', name: 'Premises registration certificate', title: 'Premises registration certificate', issuingBody: 'Pharmacy Council', status: 'AMBER', expiryDate: '2026-06-18T00:00:00.000Z' },
    { id: 'comp-2', name: 'Responsible pharmacist license', title: 'Responsible pharmacist license', issuingBody: 'Pharmacy Council', status: 'GREEN', expiryDate: '2027-02-01T00:00:00.000Z' },
    { id: 'comp-3', name: 'Temperature log review', title: 'Temperature log review', issuingBody: 'Internal SOP', status: 'RED', expiryDate: '2026-05-20T00:00:00.000Z' },
  ];
}

function staffCredentials() {
  return [
    { id: 'cred-1', staffName: 'Rehema Kato', role: 'PHARMACIST_IN_CHARGE', credentialType: 'Pharmacist license', registrationNumber: 'PC-TZ-4021', expiryDate: '2027-01-31T00:00:00.000Z', status: 'GREEN' },
    { id: 'cred-2', staffName: 'Joseph Nuru', role: 'DISPENSER', credentialType: 'Dispenser certificate', registrationNumber: 'D-1109', expiryDate: '2026-06-15T00:00:00.000Z', status: 'AMBER' },
  ];
}

function inspectionChecklistList() {
  return [{ id: 'inspection-1', generatedAt: '2026-05-14T08:00:00.000Z' }];
}

function inspectionChecklist() {
  return {
    id: 'inspection-1',
    generatedAt: '2026-05-14T08:00:00.000Z',
    pdfUrl: '',
    items: [
      { category: 'Licensing', item: 'Premises registration certificate is visible and current.', status: 'COMPLIANT', notes: null },
      { category: 'Licensing', item: 'Responsible pharmacist license is current.', status: 'COMPLIANT', notes: null },
      { category: 'Storage', item: 'Cold chain temperature logs are complete.', status: 'NON_COMPLIANT', notes: 'One missing morning reading.' },
      { category: 'Dispensing', item: 'Controlled medicines register is complete.', status: 'PENDING', notes: null },
    ],
  };
}

function analyticsOverview() {
  return { totalProducts: 28, lowStockCount: 4, expiryCount: 3, receivedUnits: 240, dispensedUnits: 186 };
}

function analyticsFeatures(pharmacy) {
  return {
    tier: pharmacy.subscriptionTier,
    historyDays: 365,
    stockout: true,
    benchmark: true,
    forecast: true,
    seasonality: true,
    deadStock: true,
    multiOutletCompare: true,
  };
}

function analyticsCompare() {
  return {
    data: {
      metric: 'DISPENSED_UNITS',
      range: '30D',
      labels: [{ key: 'w1', label: 'Week 1' }, { key: 'w2', label: 'Week 2' }],
      series: [
        { pharmacyId: activePharmacy.id, pharmacyName: activePharmacy.name, values: [{ key: 'w1', label: 'Week 1', value: 80 }, { key: 'w2', label: 'Week 2', value: 106 }] },
        { pharmacyId: branchPharmacy.id, pharmacyName: branchPharmacy.name, values: [{ key: 'w1', label: 'Week 1', value: 60 }, { key: 'w2', label: 'Week 2', value: 72 }] },
      ],
    },
  };
}

function stockoutForecast() {
  return [{ productId: products[0].id, productName: products[0].name, currentStock: 28, avgDailyDemand: 5.2, leadTimeDays: 7, daysUntilStockout: 5, estimatedStockoutDate: '2026-05-20T00:00:00.000Z', valueTzs: 7000, status: 'RISK' }];
}

function seasonality() {
  return [{ key: '2026-04', label: 'Apr 26', dispensedUnits: 410, revenueTzs: 810000 }, { key: '2026-05', label: 'May 26', dispensedUnits: 390, revenueTzs: 842000 }];
}

function deadStock() {
  return [{ productId: 'dead-1', productName: 'Slow Mover Syrup', currentStock: 18, valueTzs: 54000, daysSinceSale: 48, deadStockScore: 2592000, lastSaleAt: '2026-03-28T00:00:00.000Z' }];
}

function wholesaleCatalogue() {
  return [{ catalogueId: 'cat-1', title: 'Starter wholesale catalogue', productId: products[0].id, productName: products[0].name, genericName: products[0].genericName, price: 180, effectivePrice: 165, minOrderQuantity: 20 }];
}

function wholesaleOrders() {
  return [{ id: 'wh-order-1', orderNumber: 'PC-ORD-2026-0008', buyerPharmacyId: activePharmacy.id, buyerName: activePharmacy.name, sellerPharmacyId: wholesalePharmacy.id, status: 'CONFIRMED', items: [{ productName: products[0].name, quantity: 120, unitPrice: 165, lineTotal: 19800 }], subtotalAmount: 19800, totalAmount: 23364, scheduledDeliveryAt: '2026-05-18T09:00:00.000Z', deliveryWindowLabel: 'Morning route', createdAt: '2026-05-14T08:00:00.000Z' }];
}

function wholesaleInvoices() {
  return [{ id: 'invoice-1', orderId: 'wh-order-1', invoiceNumber: 'PC-INV-2026-000008', subtotalAmount: 19800, vatAmount: 3564, totalAmount: 23364, efdmsStatus: 'STUBBED', issuedAt: '2026-05-14T09:00:00.000Z' }];
}

function wholesaleCreditLimits() {
  return [{ id: 'credit-1', sellerPharmacyId: wholesalePharmacy.id, clientPharmacyId: activePharmacy.id, clientName: activePharmacy.name, creditLimit: 250000, outstandingBalance: 64000, paymentTermsDays: 21, isActive: true, blockNewOrders: false, blockReason: null }];
}

function receivablesAging() {
  return { totalOpenAmount: 64000, buckets: { current: 32000, days31To60: 20000, days61To90: 12000, over90: 0 }, invoices: [{ invoiceId: 'invoice-1', invoiceNumber: 'PC-INV-2026-000008', buyerName: activePharmacy.name, openAmount: 64000, daysOutstanding: 14, issuedAt: '2026-05-01T08:00:00.000Z' }] };
}

function demandInsights() {
  return { windows: { current30d: { units: 120, revenueTzs: 240000 }, previous30d: { units: 90, revenueTzs: 180000 } }, topProducts: [{ productId: products[0].id, productName: products[0].name, units: 80, revenueTzs: 120000, activeBuyers: 3 }] };
}

function articles() {
  return [{ id: 'article-1', slug: 'safe-amoxicillin-dispensing', title: 'Safer amoxicillin dispensing in community pharmacy', summary: 'Practical allergy screening and counselling checks for antibiotic sales.', category: 'CLINICAL', isSponsored: false, publishedAt: '2026-05-10T00:00:00.000Z', readingTimeMinutes: 5 }];
}

function bulletins() {
  return [{ id: 'bulletin-1', title: 'TMDA recall notice: batch verification required', body: {}, isUrgent: true, isPublished: true, publishedAt: '2026-05-12T00:00:00.000Z', createdAt: '2026-05-12T00:00:00.000Z' }];
}

function publications() {
  return [{ id: 'publication-1', title: 'Storage guidance for temperature-sensitive medicines', description: 'Updated community pharmacy cold chain expectations.', fileUrl: 'https://example.com/storage-guidance.pdf', category: 'Guidance', isPublished: true, publishedAt: '2026-05-08T00:00:00.000Z', createdAt: '2026-05-08T00:00:00.000Z' }];
}

function courses() {
  return [{ id: 'course-1', slug: 'cold-chain-basics', title: 'Cold chain basics for retail teams', description: 'A short APOTEKH learning module for safe refrigerated storage.', pointsAwarded: 2, cooldownHours: 24 }];
}

function cpdSummary() {
  return { totalPoints: 18, thisYearPoints: 12, daysToRenewal: 46, renewalAlerts: { due14: false, due60: true } };
}

function cpdActivities() {
  return [{ id: 'cpd-1', title: 'TMDA storage webinar', activityType: 'WEBINAR', activityDate: '2026-05-02T00:00:00.000Z', pointsClaimed: 2, pointsApproved: 2, auto_logged: false }];
}

function teamMembers() {
  return [
    { id: users.owner.id, firstName: users.owner.firstName, lastName: users.owner.lastName, email: users.owner.email, role: 'OWNER', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: users.pic.id, firstName: users.pic.firstName, lastName: users.pic.lastName, email: users.pic.email, role: 'PHARMACIST_IN_CHARGE', active: true, createdAt: '2026-02-01T00:00:00.000Z' },
    { id: 'user-dispenser', firstName: 'Joseph', lastName: 'Nuru', email: 'dispenser@amani.co.tz', role: 'DISPENSER', active: true, createdAt: '2026-03-01T00:00:00.000Z' },
  ];
}

function safetyImpact() {
  return {
    scope: 'pharmacy',
    totalEvents: 14,
    highRiskCount: 3,
    byType: [{ key: 'ALLERGY_WARNING', count: 6 }, { key: 'CONTRAINDICATION', count: 3 }],
    bySeverity: [{ key: 'MODERATE', count: 9 }, { key: 'MAJOR', count: 3 }],
    byAction: [{ key: 'OVERRIDE_ENTERED', count: 2 }, { key: 'COUNSELLED', count: 9 }],
    topDrugs: [{ name: 'Amoxicillin', count: 6 }, { name: 'Warfarin', count: 2 }],
    contextFlags: { pregnancy: 2, breastfeeding: 1, renal: 1, hepatic: 0, allergy: 6, diagnosis: 2 },
    officePharmacies: [{ pharmacyId: activePharmacy.id, pharmacyName: activePharmacy.name, count: 14 }],
  };
}

function founderStats() {
  return {
    pharmacies: { total: 42, active: 31 },
    users: { total: 186 },
    tierBreakdown: { ADDO: 6, STANDARD: 18, PREMIUM: 8, WHOLESALE: 4, ENTERPRISE: 2 },
    statusBreakdown: { ACTIVE: 31, TRIAL: 9, SUSPENDED: 2 },
    recentPharmacies: [
      { id: activePharmacy.id, name: activePharmacy.name, region: activePharmacy.region, subscriptionTier: activePharmacy.subscriptionTier, status: activePharmacy.status, createdAt: '2026-05-10T00:00:00.000Z' },
    ],
    recentOverrides: [
      { id: 'override-1', pharmacyId: activePharmacy.id, alertType: 'ALLERGY_WARNING', reason: 'PIC reviewed and approved with counselling.', createdAt: '2026-05-14T10:30:00.000Z', pharmacy: { name: activePharmacy.name } },
    ],
    activity: { totalDispensings: 9820, totalBatches: 340 },
  };
}

function founderRegistrations() {
  return [{ id: activePharmacy.id, name: activePharmacy.name, region: activePharmacy.region, pharmacyType: 'RETAIL', tier: 'PREMIUM', status: 'ACTIVE', trialActive: false, trialStartsAt: '2026-01-01T00:00:00.000Z', trialEndsAt: '2026-06-30T00:00:00.000Z', isActive: true, createdAt: '2026-05-10T00:00:00.000Z', owner: { name: 'Asha Mollel', email: users.owner.email, emailVerified: true } }];
}

async function openScanner(page) {
  const scanButton = page.getByRole('button', { name: 'Scan' }).first();
  if (await scanButton.count()) {
    await scanButton.click();
    const manualBarcode = page.getByLabel('Manual barcode entry');
    if (await manualBarcode.count()) {
      await manualBarcode.fill('6194000000012');
    }
  }
}

async function addDispensingItem(page) {
  const medicine = page.getByLabel('Medicine');
  await medicine.fill('amox');
  await page.getByRole('button', { name: /Amoxicillin/i }).first().click();
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await page.getByText('Rule-triggered patient checks').waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
}

async function openInspectionChecklist(page) {
  const firstChecklist = page.locator('button').filter({ hasText: /May 2026|14 May|15 May|2026/ }).first();
  if (await firstChecklist.count()) {
    await firstChecklist.click();
  }
}

async function ensureServer() {
  if (await isServerUp()) return null;

  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(command, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await waitForServer();
  return child;
}

async function isServerUp() {
  try {
    const response = await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    if (await isServerUp()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function sha256(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
  } catch {
    return null;
  }
}

async function listPngNames(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.png')).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function captureTarget(browser, target) {
  const context = await browser.newContext({
    viewport: target.viewport ?? { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await addAuth(context, target);
  const page = await context.newPage();
  await setupRoutes(page, target);

  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    errors.push(`Request failed ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${baseUrl}${target.path}`, { waitUntil: 'domcontentloaded' });
  if (target.readyText) {
    try {
      await page.waitForFunction(
        (readyText) => document.body.innerText.includes(readyText),
        target.readyText,
        { timeout: 20_000 },
      );
    } catch (error) {
      const diagnosticPath = path.join(tempDir, `${target.file}.failed.png`);
      await page.screenshot({ path: diagnosticPath, fullPage: false }).catch(() => undefined);
      const bodyText = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
      console.error(`Failed waiting for "${target.readyText}" while capturing ${target.file}`);
      console.error(`Current URL: ${page.url()}`);
      console.error(`Visible text: ${bodyText.slice(0, 1000)}`);
      if (errors.length) {
        console.error(`Captured errors: ${errors.slice(0, 8).join(' | ')}`);
      }
      throw error;
    }
  }
  if (target.action) {
    await target.action(page);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(tempDir, target.file), fullPage: false });
  await context.close();

  const meaningfulErrors = errors.filter((error) => !error.includes('favicon') && !error.includes('ResizeObserver'));
  if (meaningfulErrors.length) {
    console.warn(`Warnings while capturing ${target.file}:`);
    for (const error of meaningfulErrors.slice(0, 3)) console.warn(`  ${error}`);
  }
}

async function main() {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const server = await ensureServer();
  const browser = await chromium.launch();

  try {
    for (const target of screenshotTargets) {
      console.log(`Capturing ${target.file} from ${target.path}`);
      await captureTarget(browser, target);
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  const oldNames = await listPngNames(outputDir);
  const newNames = await listPngNames(tempDir);
  const targetNames = screenshotTargets.map((target) => target.file).sort();
  const missing = targetNames.filter((name) => !newNames.includes(name));
  if (missing.length) {
    throw new Error(`Missing generated screenshots: ${missing.join(', ')}`);
  }

  const changed = [];
  const unchanged = [];
  for (const name of newNames) {
    const oldHash = await sha256(path.join(outputDir, name));
    const newHash = await sha256(path.join(tempDir, name));
    if (oldHash && oldHash === newHash) unchanged.push(name);
    else changed.push(name);
  }

  const stale = oldNames.filter((name) => !newNames.includes(name));
  for (const name of stale) {
    await fs.rm(path.join(outputDir, name), { force: true });
  }
  for (const name of newNames) {
    await fs.copyFile(path.join(tempDir, name), path.join(outputDir, name));
  }

  console.log('');
  console.log(`Generated ${newNames.length} current screenshots.`);
  console.log(`Changed or new: ${changed.length}`);
  console.log(`Unchanged: ${unchanged.length}`);
  console.log(`Removed stale: ${stale.length}${stale.length ? ` (${stale.join(', ')})` : ''}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
