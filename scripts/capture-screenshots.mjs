#!/usr/bin/env node
/**
 * capture-screenshots.mjs
 *
 * Playwright-based screenshot capture using real login against the live
 * backend + seeded database. Run reset-and-seed.mjs first.
 *
 * Prerequisites:
 *   - Backend running on http://localhost:3000
 *   - Frontend dev server on http://127.0.0.1:4173 (or 5173)
 *     This script will start it if not running.
 *
 * Output: docs/screenshots/*.png (overwrites existing files)
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const outputDir = path.join(rootDir, 'docs', 'screenshots');
const tempDir = path.join(rootDir, 'tmp', 'screenshots-capture');

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4173';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

const requireFromFrontend = createRequire(path.join(frontendDir, 'package.json'));
const { chromium } = requireFromFrontend('@playwright/test');

// ─── Account credentials ──────────────────────────────────────────────────────

const ACCOUNTS = {
  owner: { email: 'owner@amani.co.tz', password: 'Demo123!', label: 'Owner' },
  pic: { email: 'admin@pharmaconnect.tz', password: 'Demo123!', label: 'PIC' },
  dispenser: { email: 'staff@pharmaconnect.tz', password: 'Demo123!', label: 'Dispenser' },
  kwd: { email: 'manager@kwd.co.tz', password: 'Demo123!', label: 'KWD Manager' },
  founder: { email: 'founder@pharmaconnect.tz', password: null /* read from env or prompt */ , label: 'Super Admin' },
};

// ─── Screenshot targets ───────────────────────────────────────────────────────
// Each target: { file, account, path, readySelector, action?, viewport? }

const TARGETS = [
  // ── Login page ──────────────────────────────────────────────────────────────
  {
    file: '01-login.png',
    path: '/login',
    account: null, // no auth needed
    readySelector: 'input[type="email"]',
  },

  // ── Owner: onboarding / trial confirmed ──────────────────────────────────────
  {
    file: '02-trial-confirmed.png',
    path: '/dashboard',
    account: 'owner',
    readySelector: null,
    waitText: "Today's Revenue",
  },

  // ── Owner: dashboard ─────────────────────────────────────────────────────────
  {
    file: '03-owner-dashboard.png',
    path: '/dashboard',
    account: 'owner',
    waitText: "Today's Revenue",
  },

  // ── Owner: analytics ─────────────────────────────────────────────────────────
  {
    file: '04-analytics.png',
    path: '/analytics',
    account: 'owner',
    waitText: 'Revenue',
  },

  // ── Inventory: products list ──────────────────────────────────────────────────
  {
    file: '05-products-list.png',
    path: '/inventory',
    account: 'owner',
    waitText: 'Products',
  },

  // ── Inventory: add product ────────────────────────────────────────────────────
  {
    file: '06-add-product.png',
    path: '/inventory/products/new',
    account: 'owner',
    waitText: 'Add Product',
  },

  // ── Inventory: stock intake ───────────────────────────────────────────────────
  {
    file: '07-stock-intake.png',
    path: '/inventory/stock-intake',
    account: 'owner',
    waitText: 'Stock Intake',
  },

  // ── Inventory: expiry tracker ─────────────────────────────────────────────────
  {
    file: '08-expiry-tracker.png',
    path: '/inventory/expiry',
    account: 'owner',
    waitText: 'Expiry',
  },

  // ── Dispensing: screen (owner) ────────────────────────────────────────────────
  {
    file: '09-dispensing.png',
    path: '/dispensing',
    account: 'owner',
    waitText: 'Medicine',
  },

  // ── Dispensing: screen (dispenser role) ──────────────────────────────────────
  {
    file: '10-dispensing-dispenser.png',
    path: '/dispensing',
    account: 'dispenser',
    waitText: 'Medicine',
  },

  // ── Dispensing: daily close ───────────────────────────────────────────────────
  {
    file: '11-daily-close.png',
    path: '/dispensing/daily-close',
    account: 'owner',
    waitText: 'Daily Close',
  },

  // ── Dispensing: returns/voids ─────────────────────────────────────────────────
  {
    file: '12-returns.png',
    path: '/dispensing/returns',
    account: 'owner',
    waitText: ['Void', 'Return', 'No void'],
  },

  // ── Dispensing: controlled register ──────────────────────────────────────────
  {
    file: '13-controlled-register.png',
    path: '/dispensing/controlled-register',
    account: 'owner',
    waitText: ['Controlled', 'Narcotic', 'No controlled'],
  },

  // ── Patient safety alerts ─────────────────────────────────────────────────────
  {
    file: '14-safety-alerts.png',
    path: '/dispensing/safety-alerts',
    account: 'owner',
    waitText: ['Alert', 'Safety', 'No alerts'],
  },

  // ── Compliance ────────────────────────────────────────────────────────────────
  {
    file: '15-compliance.png',
    path: '/compliance',
    account: 'owner',
    waitText: 'Compliance',
  },

  // ── Knowledge hub ────────────────────────────────────────────────────────────
  {
    file: '16-knowledge-hub.png',
    path: '/knowledge',
    account: 'owner',
    waitText: ['Knowledge', 'Article', 'Hub'],
  },

  // ── Reports ───────────────────────────────────────────────────────────────────
  {
    file: '17-reports.png',
    path: '/reports',
    account: 'owner',
    waitText: 'Report',
  },

  // ── Inventory: supplier discovery ────────────────────────────────────────────
  {
    file: '18-supplier-discovery.png',
    path: '/inventory/supplier-discovery',
    account: 'owner',
    waitText: ['Supplier', 'Wholesaler'],
  },

  // ── Inventory: stock orders ───────────────────────────────────────────────────
  {
    file: '19-stock-orders.png',
    path: '/inventory/stock-orders',
    account: 'owner',
    waitText: ['Order', 'Stock Order'],
  },

  // ── Settings: team ────────────────────────────────────────────────────────────
  {
    file: '20-settings-team.png',
    path: '/settings/team',
    account: 'owner',
    waitText: ['Team', 'User', 'Invite'],
  },

  // ── Settings: subscription ────────────────────────────────────────────────────
  {
    file: '21-settings-subscription.png',
    path: '/settings/subscription',
    account: 'owner',
    waitText: ['Subscription', 'Plan', 'Tier'],
  },

  // ── Staff activity ────────────────────────────────────────────────────────────
  {
    file: '22-staff-activity.png',
    path: '/staff-activity',
    account: 'owner',
    waitText: ['Staff', 'Activity'],
  },

  // ── Forecasting ───────────────────────────────────────────────────────────────
  {
    file: '23-forecasting.png',
    path: '/analytics/forecasting',
    account: 'owner',
    waitText: ['Forecast', 'Stockout', 'Demand'],
  },

  // ── PIC dashboard ────────────────────────────────────────────────────────────
  {
    file: '24-pic-dashboard.png',
    path: '/dashboard',
    account: 'pic',
    waitText: "Today's Revenue",
  },

  // ── Wholesale dashboard (KWD) ─────────────────────────────────────────────────
  {
    file: '25-wholesale-dashboard.png',
    path: '/wholesale',
    account: 'kwd',
    waitText: ['Wholesale', 'Order'],
  },

  // ── Wholesale orders ──────────────────────────────────────────────────────────
  {
    file: '26-wholesale-orders.png',
    path: '/wholesale/orders',
    account: 'kwd',
    waitText: ['Order', 'Status'],
  },

  // ── Supplier portal (static page — no login needed) ──────────────────────────
  // Captured from the backend directly (server-rendered HTML)
  // Note: this cannot be captured via Playwright + Vite since it's a pure backend route

  // ── Super admin dashboard ─────────────────────────────────────────────────────
  // Only captured if FOUNDER_PASSWORD env var is set
  {
    file: '27-superadmin-dashboard.png',
    path: '/superadmin',
    account: 'founder',
    waitText: ['Platform', 'Admin', 'Pharmacies'],
    requireEnv: 'FOUNDER_PASSWORD',
  },

  {
    file: '28-superadmin-pharmacies.png',
    path: '/superadmin/pharmacies',
    account: 'founder',
    waitText: ['Pharmacies', 'Arusha'],
    requireEnv: 'FOUNDER_PASSWORD',
  },
];

// ─── Login helper ─────────────────────────────────────────────────────────────

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from /login
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    { timeout: 20000 }
  ).catch(async () => {
    // Check for error message
    const errorText = await page.locator('[role="alert"], .text-red-500, .text-danger').first().textContent({ timeout: 2000 }).catch(() => '');
    throw new Error(`Login failed for ${email}: ${errorText || 'still on login page'}`);
  });
}

async function waitForContent(page, waitText) {
  if (!waitText) return;
  const texts = Array.isArray(waitText) ? waitText : [waitText];
  // Wait for any of the texts to appear
  await page.waitForFunction(
    (texts) => texts.some(t => document.body.innerText.includes(t)),
    texts,
    { timeout: 20000 }
  ).catch(() => {
    // Non-fatal: page may have rendered differently
  });
}

// ─── Server management ────────────────────────────────────────────────────────

async function isServerUp(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp(url)) return;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureFrontendServer() {
  if (await isServerUp(`${BASE_URL}/login`)) return null;

  console.log('  Starting Vite dev server...');
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    windowsHide: true,
  });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  await waitForServer(`${BASE_URL}/login`);
  return child;
}

// ─── SHA256 comparison ────────────────────────────────────────────────────────

async function sha256(filePath) {
  try {
    const buf = await fs.readFile(filePath);
    return createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

// ─── Capture session ─────────────────────────────────────────────────────────

async function captureSession(browser, targets, account, password) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    serviceWorkers: 'block',
  });

  const page = await context.newPage();

  if (account) {
    try {
      await login(page, account.email, password ?? account.password);
      console.log(`  Logged in as ${account.label}`);
    } catch (e) {
      console.error(`  ❌ Login failed for ${account.label}: ${e.message}`);
      await context.close();
      return { succeeded: [], failed: targets.map(t => t.file) };
    }
  }

  const succeeded = [];
  const failed = [];

  for (const target of targets) {
    try {
      await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await waitForContent(page, target.waitText);

      if (target.action) {
        await target.action(page);
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(tempDir, target.file), fullPage: false });
      succeeded.push(target.file);
    } catch (e) {
      console.error(`  ⚠ Failed ${target.file}: ${e.message.slice(0, 80)}`);
      failed.push(target.file);
    }
  }

  await context.close();
  return { succeeded, failed };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━'.repeat(60));
  console.log('  APOTEKH Screenshot Capture');
  console.log('━'.repeat(60));

  // Check backend — any response (even 401/404) means the server is up
  const backendUp = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(2000) })
    .then(() => true).catch(() => false);
  if (!backendUp) {
    console.warn(`\n⚠ Backend not detected at ${BACKEND_URL}.`);
    console.warn('  Make sure the backend is running: cd backend && npm run dev\n');
  }

  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const server = await ensureFrontendServer();
  const browser = await chromium.launch();

  const founderPassword = process.env.FOUNDER_PASSWORD;

  // Group targets by account key
  const grouped = new Map();
  grouped.set(null, []); // unauthenticated

  for (const target of TARGETS) {
    // Skip targets requiring an env var that isn't set
    if (target.requireEnv && !process.env[target.requireEnv]) {
      console.log(`  Skipping ${target.file} (${target.requireEnv} not set)`);
      continue;
    }
    const key = target.account;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(target);
  }

  let totalSucceeded = 0;
  let totalFailed = 0;

  try {
    for (const [accountKey, targets] of grouped) {
      if (targets.length === 0) continue;

      const account = accountKey ? ACCOUNTS[accountKey] : null;
      const password = accountKey === 'founder' ? founderPassword : null;

      console.log(`\n📸 Capturing ${targets.length} screens as: ${account?.label ?? 'unauthenticated'}`);

      const { succeeded, failed } = await captureSession(browser, targets, account, password);
      totalSucceeded += succeeded.length;
      totalFailed += failed.length;

      for (const f of succeeded) console.log(`  ✓ ${f}`);
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  // Commit screenshots to outputDir
  const newFiles = await fs.readdir(tempDir).then(f => f.filter(n => n.endsWith('.png')));
  const changed = [];
  const unchanged = [];

  for (const name of newFiles) {
    const oldHash = await sha256(path.join(outputDir, name));
    const newHash = await sha256(path.join(tempDir, name));
    if (oldHash && oldHash === newHash) unchanged.push(name);
    else changed.push(name);

    await fs.copyFile(path.join(tempDir, name), path.join(outputDir, name));
  }

  console.log('\n' + '━'.repeat(60));
  console.log(`  ✅ Captured: ${totalSucceeded} screenshots`);
  console.log(`  Changed/new: ${changed.length}`);
  console.log(`  Unchanged:   ${unchanged.length}`);
  if (totalFailed > 0) console.log(`  ❌ Failed: ${totalFailed}`);
  console.log(`  Output: ${outputDir}`);
  console.log('━'.repeat(60) + '\n');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
