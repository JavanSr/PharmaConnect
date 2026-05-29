import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const MRR_MAP: Record<string, number> = {
  ADDO: 20_000,
  ESSENTIAL: 39_000,
  ADDO_PLUS: 55_000,
  STANDARD: 55_000,
  PREMIUM: 75_000,
  WHOLESALE: 100_000,
  ENTERPRISE: 0,
  FREE: 0,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type PharmacyRow = {
  id: string;
  name: string;
  region: string;
  pharmacy_type: string;
  subscription_tier: string;
  status: string;
  trial_active: boolean;
  trial_ends_at: Date;
  is_active: boolean;
  is_hybrid: boolean;
  hybrid_addon_active: boolean;
  user_limit: number;
  internal_notes: string | null;
  created_at: Date;
  updated_at: Date;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  last_login: Date | null;
};

type AuditRow = {
  id: string;
  admin_email: string;
  action: string;
  target_pharmacy_id: string | null;
  pharmacy_name: string | null;
  details: Prisma.JsonValue;
  ip_address: string | null;
  created_at: Date;
};

type PaymentRow = {
  id: string;
  pharmacy_id: string;
  amount_tzs: number;
  payment_date: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  logged_by: string;
  created_at: Date;
};

type FeatureFlagRow = {
  pharmacy_id: string;
  feature_key: string;
  enabled: boolean;
  overridden_by: string | null;
  overridden_at: Date | null;
};

type GlobalFlagRow = {
  feature_key: string;
  enabled: boolean;
  updated_by: string | null;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  sent_by: string;
  recipient_filter: Prisma.JsonValue;
  message_body: string;
  recipient_count: number;
  sent_at: Date;
};

// ─── Pharmacy list ────────────────────────────────────────────────────────────

export async function listPharmacies(params: {
  search?: string;
  tier?: string;
  status?: string;
  region?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  const offset = (page - 1) * limit;

  const searchClause = params.search
    ? Prisma.sql`AND (
        p."name" ILIKE ${'%' + params.search + '%'}
        OR u."firstName" ILIKE ${'%' + params.search + '%'}
        OR u."lastName"  ILIKE ${'%' + params.search + '%'}
        OR u."email"     ILIKE ${'%' + params.search + '%'}
        OR u."phone"     ILIKE ${'%' + params.search + '%'}
      )`
    : Prisma.empty;

  const tierClause = params.tier
    ? Prisma.sql`AND p."subscription_tier" = ${params.tier}`
    : Prisma.empty;

  const statusClause = params.status
    ? Prisma.sql`AND p."status" = ${params.status}`
    : Prisma.empty;

  const regionClause = params.region
    ? Prisma.sql`AND p."region" ILIKE ${'%' + params.region + '%'}`
    : Prisma.empty;

  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<PharmacyRow[]>(Prisma.sql`
      SELECT
        p."id",
        p."name",
        p."region",
        p."pharmacyType"          AS pharmacy_type,
        p."subscription_tier"     AS subscription_tier,
        p."status",
        p."trial_active",
        p."trial_ends_at",
        p."isActive"              AS is_active,
        p."is_hybrid",
        p."hybrid_addon_active",
        p."userLimit"             AS user_limit,
        p."internal_notes",
        p."createdAt"             AS created_at,
        p."updatedAt"             AS updated_at,
        TRIM(COALESCE(u."firstName",'') || ' ' || COALESCE(u."lastName",'')) AS owner_name,
        u."email"                 AS owner_email,
        u."phone"                 AS owner_phone,
        MAX(u2."lastLogin")       AS last_login
      FROM "pharmacies" p
      LEFT JOIN "pharmacy_memberships" pm
        ON pm."pharmacyId" = p."id" AND pm."role" = 'OWNER' AND pm."active" = TRUE
      LEFT JOIN "users" u ON u."id" = pm."userId"
      LEFT JOIN "pharmacy_memberships" pm2 ON pm2."pharmacyId" = p."id" AND pm2."active" = TRUE
      LEFT JOIN "users" u2 ON u2."id" = pm2."userId"
      WHERE TRUE
        ${searchClause}
        ${tierClause}
        ${statusClause}
        ${regionClause}
      GROUP BY p."id", u."firstName", u."lastName", u."email", u."phone"
      ORDER BY p."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(DISTINCT p."id")::bigint AS total
      FROM "pharmacies" p
      LEFT JOIN "pharmacy_memberships" pm
        ON pm."pharmacyId" = p."id" AND pm."role" = 'OWNER' AND pm."active" = TRUE
      LEFT JOIN "users" u ON u."id" = pm."userId"
      WHERE TRUE
        ${searchClause}
        ${tierClause}
        ${statusClause}
        ${regionClause}
    `),
  ]);

  const total = Number(counts[0]?.total ?? 0);

  const activityHealth = await getActivityHealthMap(rows.map((r) => r.id));

  return {
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      pharmacyType: r.pharmacy_type,
      tier: r.subscription_tier,
      status: r.status,
      trialActive: r.trial_active,
      trialEndsAt: r.trial_ends_at?.toISOString() ?? null,
      isActive: r.is_active,
      isHybrid: r.is_hybrid,
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      ownerPhone: r.owner_phone,
      lastLogin: r.last_login?.toISOString() ?? null,
      onboardedAt: r.created_at.toISOString(),
      activityHealth: activityHealth.get(r.id) ?? 'red',
    })),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

// ─── Activity health ──────────────────────────────────────────────────────────

async function getActivityHealthMap(pharmacyIds: string[]): Promise<Map<string, 'green' | 'amber' | 'red'>> {
  if (!pharmacyIds.length) return new Map();

  const rows = await prisma.$queryRaw<Array<{ pharmacy_id: string; last_activity: Date | null }>>(Prisma.sql`
    SELECT pm."pharmacyId" AS pharmacy_id, MAX(u."lastLogin") AS last_activity
    FROM "pharmacy_memberships" pm
    JOIN "users" u ON u."id" = pm."userId"
    WHERE pm."pharmacyId" IN (${Prisma.join(pharmacyIds)})
      AND pm."active" = TRUE
    GROUP BY pm."pharmacyId"
  `);

  const map = new Map<string, 'green' | 'amber' | 'red'>();
  const now = Date.now();

  for (const row of rows) {
    if (!row.last_activity) { map.set(row.pharmacy_id, 'red'); continue; }
    const days = (now - row.last_activity.getTime()) / 86_400_000;
    map.set(row.pharmacy_id, days <= 7 ? 'green' : days <= 21 ? 'amber' : 'red');
  }

  for (const id of pharmacyIds) {
    if (!map.has(id)) map.set(id, 'red');
  }

  return map;
}

// ─── Pharmacy detail ──────────────────────────────────────────────────────────

export async function getPharmacyDetail(pharmacyId: string) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: {
      id: true,
      name: true,
      licenceNumber: true,
      address: true,
      region: true,
      pharmacyType: true,
      subscriptionTier: true,
      billingCycle: true,
      status: true,
      trialActive: true,
      trialStartsAt: true,
      trialEndsAt: true,
      isHybrid: true,
      hybridAddonActive: true,
      vfdEnabled: true,
      userLimit: true,
      isActive: true,
      graceActivatedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!pharmacy) throw Object.assign(new Error('Pharmacy not found'), { status: 404 });

  const internalNotesRow = await prisma.$queryRaw<Array<{ internal_notes: string | null }>>(Prisma.sql`
    SELECT "internal_notes" FROM "pharmacies" WHERE "id" = ${pharmacyId} LIMIT 1
  `);

  const owner = await prisma.pharmacyMembership.findFirst({
    where: { pharmacyId, role: 'OWNER', active: true },
    select: {
      user: {
        select: {
          id: true, firstName: true, lastName: true,
          email: true, phone: true, lastLogin: true, isActive: true,
        },
      },
    },
  });

  const staff = await prisma.pharmacyMembership.findMany({
    where: { pharmacyId, active: true },
    select: {
      role: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true, lastLogin: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const health = await getActivityHealthMap([pharmacyId]);

  return {
    ...pharmacy,
    internalNotes: internalNotesRow[0]?.internal_notes ?? null,
    owner: owner?.user
      ? {
          id: owner.user.id,
          name: `${owner.user.firstName} ${owner.user.lastName}`,
          email: owner.user.email,
          phone: owner.user.phone,
          lastLogin: owner.user.lastLogin?.toISOString() ?? null,
          isActive: owner.user.isActive,
        }
      : null,
    staff: staff.map((m) => ({
      id: m.user.id,
      name: `${m.user.firstName} ${m.user.lastName}`,
      email: m.user.email,
      role: m.user.role,
      membershipRole: m.role,
      lastLogin: m.user.lastLogin?.toISOString() ?? null,
    })),
    activityHealth: health.get(pharmacyId) ?? 'red',
  };
}

// ─── Pharmacy mutations ───────────────────────────────────────────────────────

export async function setPharmacyTier(pharmacyId: string, tier: string, paidUntil?: Date | null) {
  return prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: {
      subscriptionTier: tier as any,
      status: 'ACTIVE',
      trialActive: false,
      isActive: true,
      ...(paidUntil && { trialEndsAt: paidUntil }),
      subscriptionUpdatedAt: new Date(),
    },
    select: { id: true, name: true, subscriptionTier: true, status: true, trialEndsAt: true },
  });
}

export async function setPharmacyStatus(pharmacyId: string, status: string) {
  const data: Record<string, unknown> = {
    status,
    subscriptionUpdatedAt: new Date(),
  };

  if (status === 'SUSPENDED' || status === 'CANCELLED') {
    data.isActive = false;
    data.trialActive = false;
  } else if (status === 'ACTIVE') {
    data.isActive = true;
    data.trialActive = false;
  } else if (status === 'GRACE') {
    data.isActive = true;
    data.graceActivatedAt = new Date();
  }

  return prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: data as any,
    select: { id: true, name: true, status: true, isActive: true, graceActivatedAt: true },
  });
}

export async function setPharmacyExpiry(pharmacyId: string, expiresAt: Date) {
  return prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: { trialEndsAt: expiresAt, subscriptionUpdatedAt: new Date() },
    select: { id: true, name: true, trialEndsAt: true },
  });
}

export async function setPharmacyNotes(pharmacyId: string, notes: string | null) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "pharmacies" SET "internal_notes" = ${notes} WHERE "id" = ${pharmacyId}
  `);
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function logPayment(input: {
  pharmacyId: string;
  amountTzs: number;
  paymentDate: Date;
  method: string;
  reference?: string | null;
  notes?: string | null;
  loggedBy: string;
}) {
  const rows = await prisma.$queryRaw<PaymentRow[]>(Prisma.sql`
    INSERT INTO "subscription_payments"
      ("pharmacy_id","amount_tzs","payment_date","method","reference","notes","logged_by")
    VALUES
      (${input.pharmacyId}, ${input.amountTzs}, ${input.paymentDate},
       ${input.method}, ${input.reference ?? null}, ${input.notes ?? null}, ${input.loggedBy})
    RETURNING *
  `);
  return rows[0];
}

export async function listPayments(pharmacyId: string) {
  const rows = await prisma.$queryRaw<PaymentRow[]>(Prisma.sql`
    SELECT * FROM "subscription_payments"
    WHERE "pharmacy_id" = ${pharmacyId}
    ORDER BY "payment_date" DESC, "created_at" DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    amountTzs: r.amount_tzs,
    paymentDate: r.payment_date instanceof Date ? r.payment_date.toISOString().slice(0, 10) : String(r.payment_date),
    method: r.method,
    reference: r.reference,
    notes: r.notes,
    loggedBy: r.logged_by,
    createdAt: r.created_at.toISOString(),
  }));
}

// ─── Usage metrics ────────────────────────────────────────────────────────────

export async function getPharmacyUsage(pharmacyId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sevenDaysAgo  = new Date(now.getTime() -  7 * 86_400_000);

  const [totalTx, tx30d, tx7d, staffLastLogin, featureTelemetry] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM "dispensing_events" WHERE "pharmacy_id" = ${pharmacyId}
    `).catch(() => [{ count: 0n }]),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId} AND "created_at" >= ${thirtyDaysAgo}
    `).catch(() => [{ count: 0n }]),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId} AND "created_at" >= ${sevenDaysAgo}
    `).catch(() => [{ count: 0n }]),
    prisma.pharmacyMembership.findMany({
      where: { pharmacyId, active: true },
      select: {
        role: true,
        user: {
          select: { id: true, firstName: true, lastName: true, role: true, lastLogin: true },
        },
      },
    }),
    prisma.featureTelemetry.findMany({
      where: { pharmacyId },
      select: { featureKey: true },
      distinct: ['featureKey'],
    }).catch(() => [] as Array<{ featureKey: string }>),
  ]);

  const usedFeatureKeys = new Set(featureTelemetry.map((f) => f.featureKey));

  const TRACKED_FEATURES = [
    { key: 'owner_dashboard',          label: 'Owner dashboard opened' },
    { key: 'drug_interaction_checker', label: 'Drug interaction checker triggered' },
    { key: 'dose_calculator',          label: 'Dose calculator used' },
    { key: 'barcode_scanner',          label: 'Barcode scanner used' },
    { key: 'b2b_order',                label: 'B2B order placed' },
    { key: 'cpd_module',               label: 'CPD module opened' },
  ];

  const totalDispensings = Number(totalTx[0]?.count ?? 0);
  const thirtyDayLogins = staffLastLogin.filter(
    (m) => m.user.lastLogin && m.user.lastLogin >= thirtyDaysAgo,
  );

  return {
    totalTransactions: totalDispensings,
    transactions30d: Number(tx30d[0]?.count ?? 0),
    transactions7d: Number(tx7d[0]?.count ?? 0),
    staff: staffLastLogin.map((m) => ({
      id: m.user.id,
      name: `${m.user.firstName} ${m.user.lastName}`,
      role: m.user.role,
      membershipRole: m.role,
      lastLogin: m.user.lastLogin?.toISOString() ?? null,
      activeInLast30d: Boolean(m.user.lastLogin && m.user.lastLogin >= thirtyDaysAgo),
    })),
    featuresUsed: TRACKED_FEATURES.map((f) => ({
      key: f.key,
      label: f.label,
      used: usedFeatureKeys.has(f.key),
    })),
    dailyActiveUsers30d: thirtyDayLogins.length,
  };
}

// ─── Dashboard metrics ────────────────────────────────────────────────────────

export async function getDashboardMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    statusBreakdown,
    tierBreakdown,
    newThisMonth,
    mrrPayments,
    txThisMonth,
    gracePharma,
  ] = await Promise.all([
    prisma.pharmacy.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.pharmacy.groupBy({
      by: ['subscriptionTier'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
    }),
    prisma.pharmacy.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.$queryRaw<Array<{ month: string; total: bigint }>>(Prisma.sql`
      SELECT TO_CHAR("payment_date", 'YYYY-MM') AS month,
             SUM("amount_tzs")::bigint AS total
      FROM "subscription_payments"
      WHERE "payment_date" >= ${new Date(now.getFullYear(), now.getMonth() - 5, 1)}
      GROUP BY month
      ORDER BY month ASC
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM "dispensing_events"
      WHERE "created_at" >= ${startOfMonth}
    `).catch(() => [{ count: 0n }]),
    prisma.pharmacy.findMany({
      where: { status: 'GRACE' },
      select: { id: true, name: true, region: true, subscriptionTier: true, graceActivatedAt: true },
      orderBy: { graceActivatedAt: 'asc' },
    }),
  ]);

  const statusMap = Object.fromEntries(statusBreakdown.map((r) => [r.status, r._count.id]));
  const activePharmacies = statusMap['ACTIVE'] ?? 0;
  const mrr = tierBreakdown.reduce(
    (sum, r) => sum + (MRR_MAP[r.subscriptionTier] ?? 0) * r._count.id,
    0,
  );

  const churnedThisMonth = await prisma.pharmacy.count({
    where: {
      status: { in: ['CANCELLED', 'SUSPENDED'] },
      subscriptionUpdatedAt: { gte: startOfMonth },
    },
  });

  return {
    activePharmacies,
    mrr,
    transactionsThisMonth: Number(txThisMonth[0]?.count ?? 0),
    newPharmaciesThisMonth: newThisMonth,
    churnedThisMonth,
    gracePeriodCount: gracePharma.length,
    gracePeriodPharmacies: gracePharma,
    statusBreakdown: statusMap,
    mrrTrend: mrrPayments.map((r) => ({ month: r.month, totalTzs: Number(r.total) })),
  };
}

export async function getAtRiskPharmacies() {
  const all = await prisma.pharmacy.findMany({
    where: { isActive: true },
    select: { id: true, name: true, subscriptionTier: true, status: true, trialEndsAt: true },
  });

  const healthMap = await getActivityHealthMap(all.map((p) => p.id));

  return all
    .filter((p) => {
      const h = healthMap.get(p.id);
      return h === 'amber' || h === 'red';
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      tier: p.subscriptionTier,
      status: p.status,
      activityHealth: healthMap.get(p.id) ?? 'red',
    }));
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function listAuditLog(params: {
  page?: number;
  limit?: number;
  action?: string;
  adminEmail?: string;
  pharmacyId?: string;
  from?: Date;
  to?: Date;
}) {
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = (page - 1) * limit;

  const actionClause = params.action ? Prisma.sql`AND a."action" = ${params.action}` : Prisma.empty;
  const emailClause  = params.adminEmail ? Prisma.sql`AND a."admin_email" ILIKE ${'%' + params.adminEmail + '%'}` : Prisma.empty;
  const pharmClause  = params.pharmacyId ? Prisma.sql`AND a."target_pharmacy_id" = ${params.pharmacyId}` : Prisma.empty;
  const fromClause   = params.from ? Prisma.sql`AND a."created_at" >= ${params.from}` : Prisma.empty;
  const toClause     = params.to   ? Prisma.sql`AND a."created_at" <= ${params.to}`   : Prisma.empty;

  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<AuditRow[]>(Prisma.sql`
      SELECT a.*, p."name" AS pharmacy_name
      FROM "admin_audit_log" a
      LEFT JOIN "pharmacies" p ON p."id" = a."target_pharmacy_id"
      WHERE TRUE ${actionClause} ${emailClause} ${pharmClause} ${fromClause} ${toClause}
      ORDER BY a."created_at" DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM "admin_audit_log" a
      WHERE TRUE ${actionClause} ${emailClause} ${pharmClause} ${fromClause} ${toClause}
    `),
  ]);

  const total = Number(counts[0]?.total ?? 0);
  return {
    data: rows.map((r) => ({
      id: r.id,
      adminEmail: r.admin_email,
      action: r.action,
      targetPharmacyId: r.target_pharmacy_id,
      pharmacyName: r.pharmacy_name,
      details: r.details,
      ipAddress: r.ip_address,
      createdAt: r.created_at.toISOString(),
    })),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

// ─── Feature flags ────────────────────────────────────────────────────────────

export const FEATURE_KEYS = [
  'controlled_register',
  'orders_module',
  'analytics_module',
  'b2b_marketplace',
  'barcode_scanning',
  'drug_interaction_checker',
  'offline_mode',
  'cpd_module',
  'owner_dashboard',
] as const;

export async function listFeatureFlags() {
  const [perPharmacy, global] = await Promise.all([
    prisma.$queryRaw<FeatureFlagRow[]>(Prisma.sql`
      SELECT ff.*, p."name" AS pharmacy_name
      FROM "feature_flags" ff
      JOIN "pharmacies" p ON p."id" = ff."pharmacy_id"
      ORDER BY p."name" ASC, ff."feature_key" ASC
    `),
    prisma.$queryRaw<GlobalFlagRow[]>(Prisma.sql`
      SELECT * FROM "global_feature_flags" ORDER BY "feature_key" ASC
    `),
    // Ensure all global keys exist
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO "global_feature_flags" ("feature_key", "enabled")
      SELECT unnest(ARRAY[${Prisma.join(FEATURE_KEYS)}]), true
      ON CONFLICT ("feature_key") DO NOTHING
    `),
  ]);

  return {
    perPharmacy: perPharmacy.map((r) => ({
      pharmacyId: r.pharmacy_id,
      featureKey: r.feature_key,
      enabled: r.enabled,
      overriddenBy: r.overridden_by,
      overriddenAt: r.overridden_at?.toISOString() ?? null,
    })),
    global: global.map((r) => ({
      featureKey: r.feature_key,
      enabled: r.enabled,
      updatedBy: r.updated_by,
      updatedAt: r.updated_at.toISOString(),
    })),
    featureKeys: FEATURE_KEYS,
  };
}

export async function setFeatureFlag(pharmacyId: string, featureKey: string, enabled: boolean, adminEmail: string) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "feature_flags" ("pharmacy_id","feature_key","enabled","overridden_by","overridden_at")
    VALUES (${pharmacyId}, ${featureKey}, ${enabled}, ${adminEmail}, NOW())
    ON CONFLICT ("pharmacy_id","feature_key") DO UPDATE SET
      "enabled" = EXCLUDED."enabled",
      "overridden_by" = EXCLUDED."overridden_by",
      "overridden_at" = EXCLUDED."overridden_at"
  `);
}

export async function resetPharmacyFlags(pharmacyId: string) {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "feature_flags" WHERE "pharmacy_id" = ${pharmacyId}
  `);
}

export async function setGlobalFlag(featureKey: string, enabled: boolean, adminEmail: string) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "global_feature_flags" ("feature_key","enabled","updated_by","updated_at")
    VALUES (${featureKey}, ${enabled}, ${adminEmail}, NOW())
    ON CONFLICT ("feature_key") DO UPDATE SET
      "enabled" = EXCLUDED."enabled",
      "updated_by" = EXCLUDED."updated_by",
      "updated_at" = EXCLUDED."updated_at"
  `);
}

// ─── Messages ────────────────────────────────────────────────────────────────

type RecipientFilter = {
  type: 'all' | 'status' | 'tier' | 'activity_health' | 'pharmacy_ids';
  value?: string;
  pharmacyIds?: string[];
};

async function resolveRecipients(filter: RecipientFilter): Promise<string[]> {
  if (filter.type === 'pharmacy_ids' && filter.pharmacyIds?.length) {
    return filter.pharmacyIds;
  }

  if (filter.type === 'all') {
    const rows = await prisma.pharmacy.findMany({ where: { isActive: true }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  if (filter.type === 'status' && filter.value) {
    const rows = await prisma.pharmacy.findMany({
      where: { status: filter.value as any, isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  if (filter.type === 'tier' && filter.value) {
    const rows = await prisma.pharmacy.findMany({
      where: { subscriptionTier: filter.value as any, isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  if (filter.type === 'activity_health' && filter.value) {
    const allActive = await prisma.pharmacy.findMany({ where: { isActive: true }, select: { id: true } });
    const healthMap = await getActivityHealthMap(allActive.map((p) => p.id));
    return allActive.filter((p) => healthMap.get(p.id) === filter.value).map((p) => p.id);
  }

  return [];
}

export async function sendAdminMessage(input: {
  sentBy: string;
  filter: RecipientFilter;
  body: string;
}) {
  const recipientIds = await resolveRecipients(input.filter);
  if (!recipientIds.length) throw Object.assign(new Error('No recipients matched filter'), { status: 422 });

  const msgRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "admin_messages" ("sent_by","recipient_filter","message_body","recipient_count")
    VALUES (${input.sentBy}, ${JSON.stringify(input.filter)}::jsonb, ${input.body}, ${recipientIds.length})
    RETURNING id
  `);
  const messageId = msgRows[0]?.id;

  for (const pharmacyId of recipientIds) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "pharmacy_notifications" ("pharmacy_id","message_id","message_body")
      VALUES (${pharmacyId}, ${messageId}, ${input.body})
    `);
  }

  return { messageId, recipientCount: recipientIds.length };
}

export async function listAdminMessages(params: { page?: number; limit?: number }) {
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = (page - 1) * limit;

  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<MessageRow[]>(Prisma.sql`
      SELECT * FROM "admin_messages" ORDER BY "sent_at" DESC LIMIT ${limit} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total FROM "admin_messages"
    `),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      sentBy: r.sent_by,
      recipientFilter: r.recipient_filter,
      messageBody: r.message_body,
      recipientCount: r.recipient_count,
      sentAt: r.sent_at.toISOString(),
    })),
    page,
    limit,
    total: Number(counts[0]?.total ?? 0),
  };
}
