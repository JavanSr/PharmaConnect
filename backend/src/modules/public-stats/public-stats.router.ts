/**
 * Public platform stats — powers the website's proof strip.
 *
 * GET /api/v1/public-stats  (no auth, CORS-open: aggregate, anonymous data only)
 *
 * Credibility thresholds: each stat is included ONLY once it crosses its floor,
 * so the website never advertises small numbers ("4 pharmacies" hurts more than
 * silence). Values are rounded DOWN to friendly steps — the site must never
 * overstate. Cached in-memory for 1 hour to keep the endpoint cheap.
 */

import { Router } from 'express';
import { prisma } from '../../lib/prisma';

export const publicStatsRouter = Router();

interface PublicStat {
  key: string;
  label: string;
  value: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { stats: PublicStat[]; computedAt: number } | null = null;

/** Round down to a friendly step so displayed numbers are always conservative. */
function friendlyFloor(value: number): number {
  if (value >= 100_000) return Math.floor(value / 10_000) * 10_000;
  if (value >= 10_000) return Math.floor(value / 1_000) * 1_000;
  if (value >= 1_000) return Math.floor(value / 100) * 100;
  if (value >= 100) return Math.floor(value / 10) * 10;
  return value;
}

async function computeStats(): Promise<PublicStat[]> {
  // Integration tests run against this database and create pharmacies with a
  // LIC-pharmacy-* licence (tests/helpers.ts). Exclude them — this number is
  // published on the marketing site and must never be inflated by test data.
  const [pharmacies, dispensings, safetyEvents] = await Promise.all([
    prisma.pharmacy.count({
      where: {
        isActive: true,
        status: { in: ['ACTIVE', 'TRIAL'] },
        NOT: { licenceNumber: { startsWith: 'LIC-pharmacy-' } },
      },
    }),
    prisma.dispensingTransaction.count({
      where: { pharmacy: { NOT: { licenceNumber: { startsWith: 'LIC-pharmacy-' } } } },
    }),
    prisma.safetyEvent.count({
      where: { pharmacy: { NOT: { licenceNumber: { startsWith: 'LIC-pharmacy-' } } } },
    }),
  ]);

  const candidates: (PublicStat & { threshold: number })[] = [
    { key: 'pharmacies', label: 'Pharmacies on APOTEKH', value: pharmacies, threshold: 25 },
    { key: 'dispensings', label: 'Dispensings recorded', value: dispensings, threshold: 10_000 },
    { key: 'safety_checks', label: 'Safety checks surfaced', value: safetyEvents, threshold: 5_000 },
  ];

  return candidates
    .filter((stat) => stat.value >= stat.threshold)
    .map(({ key, label, value }) => ({ key, label, value: friendlyFloor(value) }));
}

publicStatsRouter.get('/', async (_req, res) => {
  try {
    // Public aggregate data — safe to open to any origin (the marketing site
    // lives on a different domain than the API).
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const now = Date.now();
    if (!cache || now - cache.computedAt > CACHE_TTL_MS) {
      cache = { stats: await computeStats(), computedAt: now };
    }

    res.json({ data: { stats: cache.stats, computedAt: new Date(cache.computedAt).toISOString() } });
  } catch (err) {
    console.error('[public-stats] failed to compute', err);
    // The website renders nothing on error — return an empty list, not a 500.
    res.json({ data: { stats: [], computedAt: new Date().toISOString() } });
  }
});
