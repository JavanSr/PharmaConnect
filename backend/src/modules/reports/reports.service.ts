import { Readable } from 'node:stream';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { expiryReport, lowStockReport, stockOnHand } from '../inventory/inventory.service';

const ALLOWED_DIMENSIONS = {
  paymentMethod: Prisma.sql`"payment_method"`,
  status: Prisma.sql`"status"`,
  day: Prisma.sql`DATE("created_at" AT TIME ZONE 'Africa/Nairobi')`,
} as const;

const ALLOWED_METRICS = {
  totalRevenue: Prisma.sql`COALESCE(SUM("total_amount"), 0)`,
  orderCount: Prisma.sql`COUNT(*)`,
  discountAmount: Prisma.sql`COALESCE(SUM("discount_amount"), 0)`,
} as const;

function asNumber(value: string | number | Prisma.Decimal | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfDay(value = new Date()) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export async function getInventoryReports(pharmacyId: string) {
  const [onHand, expiry, lowStock] = await Promise.all([
    stockOnHand(pharmacyId),
    expiryReport(pharmacyId, 90),
    lowStockReport(pharmacyId),
  ]);

  return { onHand, expiry, lowStock };
}

export async function getRevenueReport(pharmacyId: string, dateFrom?: string, dateTo?: string) {
  const filters = Prisma.sql`
    "pharmacy_id" = ${pharmacyId}
    ${dateFrom ? Prisma.sql`AND "created_at" >= ${new Date(dateFrom)}` : Prisma.empty}
    ${dateTo ? Prisma.sql`AND "created_at" <= ${new Date(dateTo)}` : Prisma.empty}
    AND "status" = 'COMPLETED'
  `;

  const [summaryRows, lineRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      revenue_total: string | number;
      transaction_count: number;
      cash_total: string | number;
    }>>(Prisma.sql`
      SELECT
        COALESCE(SUM("total_amount"), 0)::text AS revenue_total,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(CASE WHEN "payment_method" = 'CASH' THEN "total_amount" ELSE 0 END), 0)::text AS cash_total
      FROM "dispensing_events"
      WHERE ${filters}
    `),
    prisma.$queryRaw<Array<{
      id: string;
      reference_number: string;
      payment_method: string;
      total_amount: string | number;
      discount_amount: string | number;
      created_at: Date;
    }>>(Prisma.sql`
      SELECT "id", "reference_number", "payment_method", "total_amount", "discount_amount", "created_at"
      FROM "dispensing_events"
      WHERE ${filters}
      ORDER BY "created_at" DESC
      LIMIT 50000
    `),
  ]);

  return {
    totalRevenue: asNumber(summaryRows[0]?.revenue_total),
    transactionCount: summaryRows[0]?.transaction_count ?? 0,
    cashRevenue: asNumber(summaryRows[0]?.cash_total),
    lines: lineRows.map((row) => ({
      id: row.id,
      referenceNumber: row.reference_number,
      paymentMethod: row.payment_method,
      totalAmount: asNumber(row.total_amount),
      discountAmount: asNumber(row.discount_amount),
      createdAt: row.created_at.toISOString(),
    })),
  };
}

export async function getPeerBenchmark(pharmacyId: string) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { subscriptionTier: true, pharmacyType: true },
  });

  if (!pharmacy) {
    throw Object.assign(new Error('Pharmacy not found'), { status: 404 });
  }

  const cohortRows = await prisma.$queryRaw<Array<{ pharmacy_id: string; total_revenue: string | number }>>(Prisma.sql`
    SELECT
      p."id" AS pharmacy_id,
      COALESCE(SUM(de."total_amount"), 0)::text AS total_revenue
    FROM "pharmacies" p
    LEFT JOIN "dispensing_events" de ON de."pharmacy_id" = p."id" AND de."status" = 'COMPLETED'
    WHERE CAST(p."subscription_tier" AS TEXT) = ${pharmacy.subscriptionTier}
      AND CAST(p."pharmacyType" AS TEXT) = ${pharmacy.pharmacyType}
    GROUP BY p."id"
  `);

  if (cohortRows.length < 10) {
    return {
      available: false,
      cohortSize: cohortRows.length,
      message: 'Benchmarking requires at least 10 pharmacies in the cohort.',
    };
  }

  const revenuesByPharmacy = cohortRows.map((row) => ({
    pharmacyId: row.pharmacy_id,
    revenue: asNumber(row.total_revenue),
  }));
  const sortedRevenues = revenuesByPharmacy.map((row) => row.revenue).sort((a, b) => a - b);
  const ownRevenue = revenuesByPharmacy.find((row) => row.pharmacyId === pharmacyId)?.revenue ?? 0;
  const averageRevenue = sortedRevenues.reduce((sum, value) => sum + value, 0) / sortedRevenues.length;

  return {
    available: true,
    cohortSize: sortedRevenues.length,
    ownRevenue,
    averageRevenue: Number(averageRevenue.toFixed(2)),
    medianRevenue: sortedRevenues[Math.floor(sortedRevenues.length / 2)] ?? 0,
  };
}

export async function runCustomBuilder(pharmacyId: string, dimension: keyof typeof ALLOWED_DIMENSIONS, metric: keyof typeof ALLOWED_METRICS) {
  if (!(dimension in ALLOWED_DIMENSIONS) || !(metric in ALLOWED_METRICS)) {
    throw Object.assign(new Error('INVALID_REPORT_SELECTION'), { status: 400, code: 'INVALID_REPORT_SELECTION' });
  }

  const rows = await prisma.$queryRaw<Array<{ dimension_value: string | Date | null; metric_value: string | number }>>(Prisma.sql`
    SELECT
      ${ALLOWED_DIMENSIONS[dimension]} AS dimension_value,
      ${ALLOWED_METRICS[metric]} AS metric_value
    FROM "dispensing_events"
    WHERE "pharmacy_id" = ${pharmacyId}
    GROUP BY 1
    ORDER BY 1 ASC NULLS LAST
  `);

  return rows.map((row) => ({
    dimension: row.dimension_value instanceof Date ? row.dimension_value.toISOString().slice(0, 10) : row.dimension_value,
    value: asNumber(row.metric_value),
  }));
}

export async function getStaffActivityReport(pharmacyId: string) {
  const todayStart = startOfDay();
  const tomorrowStart = addDays(todayStart, 1);
  const weekStart = addDays(todayStart, -6);
  const thirtyDayStart = addDays(todayStart, -29);

  type StaffRow = {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    user_role: string;
    last_login: Date | null;
  };
  type LoginRow = { user_id: string; created_at: Date };
  type ActivityRow = { user_id: string; last_active: Date | null };
  type DispenseRow = { user_id: string; count: number; revenue: string | number };
  type CountRow = { user_id: string; count: number };
  type DailyRevenueRow = { user_id: string; day: Date; revenue: string | number };
  type TopMedicineRow = { user_id: string; medicine: string; count: number };
  type InteractionHistoryRow = {
    id: string;
    user_id: string;
    created_at: Date;
    drug_names: string[];
    severity: string;
    overridden: boolean;
  };
  type ActionHistoryRow = {
    id: string;
    user_id: string;
    created_at: Date;
    kind: string;
    reason: string | null;
    reference: string | null;
  };

  const [
    staffRows,
    loginRows,
    activityRows,
    todayDispenseRows,
    weekDispenseRows,
    weekVoidRows,
    weekAdjustmentRows,
    weekInteractionRows,
    weekPinOverrideRows,
    dailyRevenueRows,
    topMedicineRows,
    interactionHistoryRows,
    actionHistoryRows,
  ] = await Promise.all([
    prisma.$queryRaw<StaffRow[]>(Prisma.sql`
      SELECT DISTINCT ON (u."id")
        u."id",
        u."firstName" AS "first_name",
        u."lastName" AS "last_name",
        CAST(pm."role" AS TEXT) AS "role",
        CAST(u."role" AS TEXT) AS "user_role",
        u."lastLogin" AS "last_login"
      FROM "pharmacy_memberships" pm
      JOIN "users" u ON u."id" = pm."user_id"
      WHERE pm."pharmacy_id" = ${pharmacyId}
        AND pm."active" = true
        AND u."isActive" = true
        AND (pm."valid_from" IS NULL OR pm."valid_from" <= CURRENT_TIMESTAMP)
        AND (pm."valid_until" IS NULL OR pm."valid_until" >= CURRENT_TIMESTAMP)
      ORDER BY u."id", pm."created_at" DESC
    `),
    prisma.$queryRaw<LoginRow[]>(Prisma.sql`
      SELECT "acted_by" AS "user_id", "created_at"
      FROM "audit_log"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "table_name" = 'auth_sessions'
        AND "action" = 'LOGIN'
        AND "acted_by" IS NOT NULL
        AND "created_at" >= ${thirtyDayStart}
      ORDER BY "created_at" ASC
    `),
    prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
      SELECT "user_id", MAX("created_at") AS "last_active"
      FROM (
        SELECT "acted_by" AS "user_id", "created_at" FROM "audit_log"
          WHERE "pharmacy_id" = ${pharmacyId} AND "acted_by" IS NOT NULL
        UNION ALL
        SELECT "userId" AS "user_id", "createdAt" AS "created_at" FROM "stock_movements"
          WHERE "pharmacyId" = ${pharmacyId}
        UNION ALL
        SELECT "dispensed_by" AS "user_id", "created_at" FROM "dispensing_events"
          WHERE "pharmacy_id" = ${pharmacyId}
        UNION ALL
        SELECT "voided_by" AS "user_id", "voided_at" AS "created_at" FROM "dispensing_events"
          WHERE "pharmacy_id" = ${pharmacyId} AND "voided_by" IS NOT NULL AND "voided_at" IS NOT NULL
        UNION ALL
        SELECT "user_id", "created_at" FROM "override_log"
          WHERE "pharmacy_id" = ${pharmacyId}
        UNION ALL
        SELECT "pic_user_id" AS "user_id", "created_at" FROM "override_log"
          WHERE "pharmacy_id" = ${pharmacyId}
        UNION ALL
        SELECT "user_id", "created_at" FROM "safety_events"
          WHERE "pharmacy_id" = ${pharmacyId} AND "user_id" IS NOT NULL
      ) activity
      GROUP BY "user_id"
    `),
    prisma.$queryRaw<DispenseRow[]>(Prisma.sql`
      SELECT "dispensed_by" AS "user_id", COUNT(*)::int AS "count", COALESCE(SUM("total_amount"), 0)::text AS "revenue"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "status" = 'COMPLETED'
        AND "created_at" >= ${todayStart}
        AND "created_at" < ${tomorrowStart}
      GROUP BY "dispensed_by"
    `),
    prisma.$queryRaw<DispenseRow[]>(Prisma.sql`
      SELECT "dispensed_by" AS "user_id", COUNT(*)::int AS "count", COALESCE(SUM("total_amount"), 0)::text AS "revenue"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "status" = 'COMPLETED'
        AND "created_at" >= ${weekStart}
      GROUP BY "dispensed_by"
    `),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT "voided_by" AS "user_id", COUNT(*)::int AS "count"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "voided_by" IS NOT NULL
        AND "voided_at" >= ${weekStart}
      GROUP BY "voided_by"
    `),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT "userId" AS "user_id", COUNT(*)::int AS "count"
      FROM "stock_movements"
      WHERE "pharmacyId" = ${pharmacyId}
        AND "type" IN ('ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED')
        AND "createdAt" >= ${weekStart}
      GROUP BY "userId"
    `),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT "user_id", COUNT(*)::int AS "count"
      FROM "safety_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "user_id" IS NOT NULL
        AND "event_type" = 'INTERACTION_WARNING'
        AND "created_at" >= ${weekStart}
      GROUP BY "user_id"
    `),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT "pic_user_id" AS "user_id", COUNT(*)::int AS "count"
      FROM "override_log"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "created_at" >= ${weekStart}
      GROUP BY "pic_user_id"
    `),
    prisma.$queryRaw<DailyRevenueRow[]>(Prisma.sql`
      SELECT "dispensed_by" AS "user_id", DATE_TRUNC('day', "created_at")::date AS "day", COALESCE(SUM("total_amount"), 0)::text AS "revenue"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "status" = 'COMPLETED'
        AND "created_at" >= ${thirtyDayStart}
      GROUP BY "dispensed_by", DATE_TRUNC('day', "created_at")::date
      ORDER BY "day" ASC
    `),
    prisma.$queryRaw<TopMedicineRow[]>(Prisma.sql`
      SELECT
        de."dispensed_by" AS "user_id",
        COALESCE(item.value->>'productName', item.value->>'genericName', 'Unknown medicine') AS "medicine",
        SUM(COALESCE((item.value->>'quantity')::int, 1))::int AS "count"
      FROM "dispensing_events" de
      CROSS JOIN LATERAL jsonb_array_elements(de."items") AS item(value)
      WHERE de."pharmacy_id" = ${pharmacyId}
        AND de."status" = 'COMPLETED'
        AND de."created_at" >= ${thirtyDayStart}
      GROUP BY de."dispensed_by", COALESCE(item.value->>'productName', item.value->>'genericName', 'Unknown medicine')
      ORDER BY de."dispensed_by", "count" DESC
    `),
    prisma.$queryRaw<InteractionHistoryRow[]>(Prisma.sql`
      SELECT
        se."id",
        se."user_id",
        se."created_at",
        se."drug_names",
        se."severity",
        EXISTS (
          SELECT 1
          FROM "safety_events" ov
          WHERE ov."pharmacy_id" = se."pharmacy_id"
            AND ov."dispensing_event_id" = se."dispensing_event_id"
            AND ov."action_taken" = 'OVERRIDE_ENTERED'
        ) OR EXISTS (
          SELECT 1
          FROM "override_log" ol
          WHERE ol."pharmacy_id" = se."pharmacy_id"
            AND ol."payload"->>'dispensingEventId' = se."dispensing_event_id"::text
        ) AS "overridden"
      FROM "safety_events" se
      WHERE se."pharmacy_id" = ${pharmacyId}
        AND se."user_id" IS NOT NULL
        AND se."event_type" = 'INTERACTION_WARNING'
        AND se."created_at" >= ${thirtyDayStart}
      ORDER BY se."created_at" DESC
      LIMIT 200
    `),
    prisma.$queryRaw<ActionHistoryRow[]>(Prisma.sql`
      SELECT "id", "voided_by" AS "user_id", "voided_at" AS "created_at", 'VOID' AS "kind", "void_reason" AS "reason", "reference_number" AS "reference"
      FROM "dispensing_events"
      WHERE "pharmacy_id" = ${pharmacyId}
        AND "voided_by" IS NOT NULL
        AND "voided_at" >= ${thirtyDayStart}
      UNION ALL
      SELECT sm."id", sm."userId" AS "user_id", sm."createdAt" AS "created_at", CAST(sm."type" AS TEXT) AS "kind", sm."notes" AS "reason", p."name" AS "reference"
      FROM "stock_movements" sm
      JOIN "products" p ON p."id" = sm."productId"
      WHERE sm."pharmacyId" = ${pharmacyId}
        AND sm."type" IN ('ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED')
        AND sm."createdAt" >= ${thirtyDayStart}
      ORDER BY "created_at" DESC
      LIMIT 200
    `),
  ]);

  const byUser = <T extends { user_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      map.set(row.user_id, [...(map.get(row.user_id) ?? []), row]);
    }
    return map;
  };
  const firstByUser = <T extends { user_id: string }>(rows: T[]) => new Map(rows.map((row) => [row.user_id, row]));
  const todayDispenseByUser = firstByUser(todayDispenseRows);
  const weekDispenseByUser = firstByUser(weekDispenseRows);
  const weekVoidByUser = firstByUser(weekVoidRows);
  const weekAdjustmentByUser = firstByUser(weekAdjustmentRows);
  const weekInteractionByUser = firstByUser(weekInteractionRows);
  const weekPinByUser = firstByUser(weekPinOverrideRows);
  const loginByUser = byUser(loginRows);
  const activityByUser = firstByUser(activityRows);
  const dailyRevenueByUser = byUser(dailyRevenueRows);
  const topMedicineByUser = byUser(topMedicineRows);
  const interactionHistoryByUser = byUser(interactionHistoryRows);
  const actionHistoryByUser = byUser(actionHistoryRows);

  const days = Array.from({ length: 30 }, (_, index) => {
    const day = addDays(thirtyDayStart, index);
    return dateKey(day);
  });

  const staff = staffRows.map((staffer) => {
    const userLogins = loginByUser.get(staffer.id) ?? [];
    const activeDays = new Set(userLogins.map((row) => dateKey(row.created_at)));
    const todayLogin = userLogins.find((row) => row.created_at >= todayStart && row.created_at < tomorrowStart);
    const revenueByDay = new Map(
      (dailyRevenueByUser.get(staffer.id) ?? []).map((row) => [dateKey(row.day), asNumber(row.revenue)]),
    );
    const topMedicines = (topMedicineByUser.get(staffer.id) ?? []).slice(0, 10).map((row) => ({
      medicine: row.medicine,
      count: Number(row.count ?? 0),
    }));

    return {
      id: staffer.id,
      name: `${staffer.first_name} ${staffer.last_name}`.trim(),
      role: staffer.role || staffer.user_role,
      lastActiveAt: activityByUser.get(staffer.id)?.last_active?.toISOString() ?? staffer.last_login?.toISOString() ?? null,
      today: {
        loginTime: todayLogin?.created_at.toISOString() ?? null,
        dispenses: Number(todayDispenseByUser.get(staffer.id)?.count ?? 0),
        revenue: asNumber(todayDispenseByUser.get(staffer.id)?.revenue),
      },
      week: {
        dispenses: Number(weekDispenseByUser.get(staffer.id)?.count ?? 0),
        revenue: asNumber(weekDispenseByUser.get(staffer.id)?.revenue),
        voids: Number(weekVoidByUser.get(staffer.id)?.count ?? 0),
        adjustments: Number(weekAdjustmentByUser.get(staffer.id)?.count ?? 0),
        interactionAlerts: Number(weekInteractionByUser.get(staffer.id)?.count ?? 0),
        pinOverrides: Number(weekPinByUser.get(staffer.id)?.count ?? 0),
      },
      detail: {
        loginDays: days.map((day) => ({ date: day, active: activeDays.has(day) })),
        revenueByDay: days.map((day) => ({ date: day, revenue: revenueByDay.get(day) ?? 0 })),
        topMedicines,
        interactionAlerts: (interactionHistoryByUser.get(staffer.id) ?? []).map((row) => ({
          id: row.id,
          date: row.created_at.toISOString(),
          medicinePair: (row.drug_names ?? []).length >= 2
            ? row.drug_names.slice(0, 2).join(' + ')
            : (row.drug_names ?? []).join(' + ') || 'Interaction alert',
          severity: row.severity,
          overridden: Boolean(row.overridden),
        })),
        voidsAndAdjustments: (actionHistoryByUser.get(staffer.id) ?? []).map((row) => ({
          id: row.id,
          date: row.created_at.toISOString(),
          type: row.kind,
          reason: row.reason,
          reference: row.reference,
        })),
      },
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    range: {
      todayStart: todayStart.toISOString(),
      weekStart: weekStart.toISOString(),
      thirtyDayStart: thirtyDayStart.toISOString(),
    },
    staff,
    comparison: staff.map((staffer) => ({
      userId: staffer.id,
      name: staffer.name,
      role: staffer.role,
      dispenses: staffer.week.dispenses,
      revenue: staffer.week.revenue,
      pinOverrides: staffer.week.pinOverrides,
      flagPinOverrides: staffer.week.pinOverrides > 3,
    })),
  };
}

export function streamCsv(rows: Array<Record<string, unknown>>) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  function* generate() {
    yield `${headers.join(',')}\n`;
    for (const row of rows) {
      const line = headers
        .map((header) => {
          const value = row[header];
          const text = value == null ? '' : String(value).replace(/"/g, '""');
          return `"${text}"`;
        })
        .join(',');
      yield `${line}\n`;
    }
  }

  return Readable.from(generate());
}

export async function renderReportPdf(title: string, rows: Array<Record<string, unknown>>) {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text(title);
    doc.moveDown();
    rows.slice(0, 100).forEach((row) => {
      doc.fontSize(10).text(JSON.stringify(row));
      doc.moveDown(0.25);
    });
    if (rows.length > 100) {
      doc.moveDown().fontSize(9).text(`Showing first 100 rows of ${rows.length}.`);
    }
    doc.end();
  });
}


// ── Dispensing report ─────────────────────────────────────────────────────────
export async function getDispensingReport(pharmacyId: string, dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const to   = dateTo   ? new Date(dateTo)   : new Date();

  const [summaryRows, lineRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total_revenue: string; total_transactions: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(total_amount),0)::text AS total_revenue, COUNT(*)::int AS total_transactions
      FROM dispensing_events
      WHERE pharmacy_id=${pharmacyId} AND status='COMPLETED'
        AND created_at>=${from} AND created_at<=${to}
    `),
    prisma.$queryRaw<Array<{ product_name: string; total_units: number; total_revenue: string; transaction_count: number }>>(Prisma.sql`
      SELECT
        COALESCE(item.value->>'productName', item.value->>'genericName', 'Unknown') AS product_name,
        SUM(COALESCE((item.value->>'quantity')::int, 1))::int AS total_units,
        COALESCE(SUM(COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)),0)::text AS total_revenue,
        COUNT(DISTINCT de.id)::int AS transaction_count
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      WHERE de.pharmacy_id=${pharmacyId} AND de.status='COMPLETED'
        AND de.created_at>=${from} AND de.created_at<=${to}
      GROUP BY 1 ORDER BY total_units DESC LIMIT 200
    `),
  ]);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    totalRevenue: asNumber(summaryRows[0]?.total_revenue),
    totalTransactions: summaryRows[0]?.total_transactions ?? 0,
    lines: lineRows.map(r => ({
      productName: r.product_name,
      totalUnits: Number(r.total_units),
      totalRevenue: asNumber(r.total_revenue),
      transactionCount: Number(r.transaction_count),
    })),
  };
}

// ── Stock movement report ─────────────────────────────────────────────────────
export async function getStockMovementReport(pharmacyId: string, dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const to   = dateTo   ? new Date(dateTo)   : new Date();

  const rows = await prisma.$queryRaw<Array<{
    product_name: string; movement_type: string; quantity: number;
    notes: string | null; created_at: Date; user_name: string | null;
  }>>(Prisma.sql`
    SELECT p.name AS product_name, CAST(sm.type AS TEXT) AS movement_type,
      sm.quantity, sm.notes, sm."createdAt" AS created_at,
      CONCAT(u."firstName",' ',u."lastName") AS user_name
    FROM stock_movements sm
    JOIN products p ON p.id=sm."productId"
    LEFT JOIN users u ON u.id=sm."userId"
    WHERE sm."pharmacyId"=${pharmacyId}
      AND sm."createdAt">=${from} AND sm."createdAt"<=${to}
    ORDER BY sm."createdAt" DESC LIMIT 5000
  `);

  const summary: Record<string, number> = {};
  for (const r of rows) summary[r.movement_type] = (summary[r.movement_type] ?? 0) + Number(r.quantity);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    summary,
    lines: rows.map(r => ({
      productName: r.product_name,
      movementType: r.movement_type,
      quantity: Number(r.quantity),
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
      staffName: r.user_name,
    })),
  };
}

// ── Expiry by threshold report ────────────────────────────────────────────────
// Urgency formula matches expiry-alerts.ts expiryUrgency()
export async function getExpiryByThresholdReport(pharmacyId: string, thresholdDays = 90) {
  const today  = startOfDay();
  const cutoff = addDays(today, thresholdDays);

  const batches = await prisma.batch.findMany({
    where: { pharmacyId, quantityRemaining: { gt: 0 }, expiryDate: { lte: cutoff } },
    include: { product: { select: { name: true, genericName: true } } },
    orderBy: { expiryDate: 'asc' },
  });

  const withUrgency = batches.map(b => {
    const days = Math.ceil((startOfDay(b.expiryDate).getTime() - today.getTime()) / 86400000);
    let urgency = 'MONITOR';
    if (days < 0)   urgency = 'EXPIRED';
    else if (days <= 1)  urgency = 'CRITICAL';
    else if (days <= 7)  urgency = 'URGENT';
    else if (days <= 14) urgency = 'WARNING';
    else if (days <= 21) urgency = 'CAUTION';
    else if (days <= 30) urgency = 'INFO';
    return {
      productName: b.product.name,
      genericName: b.product.genericName ?? null,
      batchNumber: b.batchNumber,
      quantityRemaining: b.quantityRemaining,
      expiryDate: b.expiryDate.toISOString().slice(0, 10),
      daysUntilExpiry: days,
      urgency,
    };
  });

  const byThreshold: Record<string, number> = {};
  for (const b of withUrgency) byThreshold[b.urgency] = (byThreshold[b.urgency] ?? 0) + 1;

  return { generatedAt: new Date().toISOString(), thresholdDays, byThreshold, batches: withUrgency };
}

// ── Voids and returns report ──────────────────────────────────────────────────
export async function getVoidsAndReturnsReport(pharmacyId: string, dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const to   = dateTo   ? new Date(dateTo)   : new Date();

  const rows = await prisma.$queryRaw<Array<{
    reference_number: string; total_amount: string; void_reason: string | null;
    voided_at: Date; voided_by_name: string | null;
  }>>(Prisma.sql`
    SELECT de.reference_number, de.total_amount::text, de.void_reason, de.voided_at,
      CONCAT(u."firstName",' ',u."lastName") AS voided_by_name
    FROM dispensing_events de
    LEFT JOIN users u ON u.id=de.voided_by
    WHERE de.pharmacy_id=${pharmacyId} AND de.status='VOIDED'
      AND de.voided_at>=${from} AND de.voided_at<=${to}
    ORDER BY de.voided_at DESC LIMIT 2000
  `);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    totalVoided: rows.length,
    totalValue: rows.reduce((s, r) => s + asNumber(r.total_amount), 0),
    lines: rows.map(r => ({
      referenceNumber: r.reference_number,
      totalAmount: asNumber(r.total_amount),
      voidReason: r.void_reason,
      voidedAt: r.voided_at.toISOString(),
      voidedBy: r.voided_by_name,
    })),
  };
}

// ── Sales Report (date-range, comparison, time-series) ───────────────────────
export async function getSalesReport(
  pharmacyId: string,
  dateFrom?: string,
  dateTo?: string,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  const to   = dateTo   ? new Date(dateTo)   : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const rangeMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - rangeMs);
  const truncUnit = groupBy === 'month' ? 'month' : groupBy === 'week' ? 'week' : 'day';

  const [summaryRows, prevSummaryRows, timeSeriesRows, topProductRows, paymentRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total_revenue: string; transaction_count: number; items_sold: number }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(total_amount), 0)::text AS total_revenue,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(jsonb_array_length(items)), 0)::int AS items_sold
      FROM dispensing_events
      WHERE pharmacy_id = ${pharmacyId} AND status = 'COMPLETED'
        AND created_at >= ${from} AND created_at <= ${to}
    `),
    prisma.$queryRaw<Array<{ total_revenue: string; transaction_count: number }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(total_amount), 0)::text AS total_revenue,
        COUNT(*)::int AS transaction_count
      FROM dispensing_events
      WHERE pharmacy_id = ${pharmacyId} AND status = 'COMPLETED'
        AND created_at >= ${prevFrom} AND created_at <= ${prevTo}
    `),
    prisma.$queryRaw<Array<{ period: Date; revenue: string; transaction_count: number }>>(Prisma.sql`
      SELECT
        DATE_TRUNC(${truncUnit}, created_at) AS period,
        COALESCE(SUM(total_amount), 0)::text AS revenue,
        COUNT(*)::int AS transaction_count
      FROM dispensing_events
      WHERE pharmacy_id = ${pharmacyId} AND status = 'COMPLETED'
        AND created_at >= ${from} AND created_at <= ${to}
      GROUP BY 1 ORDER BY 1 ASC
    `),
    prisma.$queryRaw<Array<{ product_name: string; total_units: number; total_revenue: string }>>(Prisma.sql`
      SELECT
        COALESCE(item.value->>'productName', item.value->>'genericName', 'Unknown') AS product_name,
        SUM(COALESCE((item.value->>'quantity')::int, 1))::int AS total_units,
        COALESCE(SUM(
          COALESCE((item.value->>'unitPrice')::numeric, 0) * COALESCE((item.value->>'quantity')::int, 1)
        ), 0)::text AS total_revenue
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      WHERE de.pharmacy_id = ${pharmacyId} AND de.status = 'COMPLETED'
        AND de.created_at >= ${from} AND de.created_at <= ${to}
      GROUP BY 1 ORDER BY SUM(COALESCE((item.value->>'quantity')::int, 1)) DESC LIMIT 10
    `),
    prisma.$queryRaw<Array<{ payment_method: string; transaction_count: number; total_revenue: string }>>(Prisma.sql`
      SELECT
        payment_method,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(total_amount), 0)::text AS total_revenue
      FROM dispensing_events
      WHERE pharmacy_id = ${pharmacyId} AND status = 'COMPLETED'
        AND created_at >= ${from} AND created_at <= ${to}
      GROUP BY payment_method ORDER BY SUM(total_amount) DESC
    `),
  ]);

  const curRevenue = asNumber(summaryRows[0]?.total_revenue);
  const prevRevenue = asNumber(prevSummaryRows[0]?.total_revenue);
  const curTxns    = summaryRows[0]?.transaction_count ?? 0;
  const prevTxns   = prevSummaryRows[0]?.transaction_count ?? 0;

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      totalRevenue: curRevenue,
      totalSales: curTxns,
      itemsSold: summaryRows[0]?.items_sold ?? 0,
      avgBasket: curTxns > 0 ? Math.round(curRevenue / curTxns) : 0,
    },
    comparison: {
      prevRevenue,
      prevSales: prevTxns,
      revenueDeltaPct: prevRevenue > 0 ? Math.round((curRevenue - prevRevenue) / prevRevenue * 100) : null,
      salesDeltaPct:   prevTxns   > 0 ? Math.round((curTxns   - prevTxns)   / prevTxns   * 100) : null,
    },
    timeSeries: timeSeriesRows.map(r => ({
      period: r.period.toISOString().slice(0, 10),
      revenue: asNumber(r.revenue),
      transactionCount: Number(r.transaction_count),
    })),
    topProducts: topProductRows.map(r => ({
      productName: r.product_name,
      totalUnits: Number(r.total_units),
      totalRevenue: asNumber(r.total_revenue),
    })),
    paymentBreakdown: paymentRows.map(r => ({
      paymentMethod: r.payment_method,
      transactionCount: Number(r.transaction_count),
      totalRevenue: asNumber(r.total_revenue),
    })),
  };
}

// ── Profit & Margin Report (STANDARD+, OWNER only) ────────────────────────────
export async function getProfitReport(pharmacyId: string, dateFrom?: string, dateTo?: string) {
  const to   = dateTo   ? new Date(dateTo)   : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const rangeMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - rangeMs);

  type SummaryRow = { total_revenue: string; total_cogs: string; lines_missing_cost: number };
  type PrevRow    = { total_revenue: string; total_cogs: string };
  type TsRow      = { period: Date; revenue: string; cogs: string };
  type ProductRow = { product_name: string; revenue: string; cogs: string; units: number };

  const itemRevCogs = Prisma.sql`
    COALESCE((item.value->>'unitPrice')::numeric, 0) * COALESCE((item.value->>'quantity')::int, 1) AS item_rev,
    COALESCE(b."purchasePrice", 0) * COALESCE((item.value->>'quantity')::int, 1) AS item_cogs
  `;
  void itemRevCogs; // not used directly — expressions inlined below for clarity

  const [summaryRows, prevRows, tsRows, topRows, lowRows] = await Promise.all([
    prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(
          COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS total_revenue,
        COALESCE(SUM(
          COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS total_cogs,
        COUNT(CASE WHEN b."purchasePrice" IS NULL THEN 1 END)::int AS lines_missing_cost
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      LEFT JOIN batches b ON b.id = (item.value->>'batchId')::uuid
      WHERE de.pharmacy_id=${pharmacyId} AND de.status='COMPLETED'
        AND de.created_at>=${from} AND de.created_at<=${to}
    `),
    prisma.$queryRaw<PrevRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(
          COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS total_revenue,
        COALESCE(SUM(
          COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS total_cogs
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      LEFT JOIN batches b ON b.id = (item.value->>'batchId')::uuid
      WHERE de.pharmacy_id=${pharmacyId} AND de.status='COMPLETED'
        AND de.created_at>=${prevFrom} AND de.created_at<=${prevTo}
    `),
    prisma.$queryRaw<TsRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', de.created_at) AS period,
        COALESCE(SUM(
          COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS revenue,
        COALESCE(SUM(
          COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS cogs
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      LEFT JOIN batches b ON b.id = (item.value->>'batchId')::uuid
      WHERE de.pharmacy_id=${pharmacyId} AND de.status='COMPLETED'
        AND de.created_at>=${from} AND de.created_at<=${to}
      GROUP BY 1 ORDER BY 1 ASC
    `),
    prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT
        COALESCE(item.value->>'productName', item.value->>'genericName','Unknown') AS product_name,
        COALESCE(SUM(
          COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS revenue,
        COALESCE(SUM(
          COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS cogs,
        SUM(COALESCE((item.value->>'quantity')::int,1))::int AS units
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      LEFT JOIN batches b ON b.id = (item.value->>'batchId')::uuid
      WHERE de.pharmacy_id=${pharmacyId} AND de.status='COMPLETED'
        AND de.created_at>=${from} AND de.created_at<=${to}
      GROUP BY 1
      ORDER BY (SUM(COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1))
               - SUM(COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1))) DESC NULLS LAST
      LIMIT 10
    `),
    prisma.$queryRaw<ProductRow[]>(Prisma.sql`
      SELECT
        COALESCE(item.value->>'productName', item.value->>'genericName','Unknown') AS product_name,
        COALESCE(SUM(
          COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS revenue,
        COALESCE(SUM(
          COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1)
        ),0)::text AS cogs,
        SUM(COALESCE((item.value->>'quantity')::int,1))::int AS units
      FROM dispensing_events de
      CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
      LEFT JOIN batches b ON b.id = (item.value->>'batchId')::uuid
      WHERE de.pharmacy_id=${pharmacyId} AND de.status='COMPLETED'
        AND de.created_at>=${from} AND de.created_at<=${to}
        AND b."purchasePrice" IS NOT NULL
      GROUP BY 1
      HAVING SUM(COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)) > 0
      ORDER BY (
        SUM(COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1))
        - SUM(COALESCE(b."purchasePrice",0)*COALESCE((item.value->>'quantity')::int,1))
      ) / SUM(COALESCE((item.value->>'unitPrice')::numeric,0)*COALESCE((item.value->>'quantity')::int,1)) ASC
      LIMIT 10
    `),
  ]);

  const curRev    = asNumber(summaryRows[0]?.total_revenue);
  const curCogs   = asNumber(summaryRows[0]?.total_cogs);
  const curProfit = curRev - curCogs;
  const curMargin = curRev > 0 ? (curProfit / curRev) * 100 : 0;

  const prevRev    = asNumber(prevRows[0]?.total_revenue);
  const prevCogs   = asNumber(prevRows[0]?.total_cogs);
  const prevProfit = prevRev - prevCogs;
  const prevMargin = prevRev > 0 ? (prevProfit / prevRev) * 100 : 0;

  function mapProduct(r: ProductRow) {
    const rev    = asNumber(r.revenue);
    const cogs   = asNumber(r.cogs);
    const profit = rev - cogs;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    return {
      productName: r.product_name,
      totalUnits: Number(r.units),
      revenue: rev,
      cogs,
      grossProfit: profit,
      marginPct: Math.round(margin * 10) / 10,
    };
  }

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    linesWithMissingCost: summaryRows[0]?.lines_missing_cost ?? 0,
    summary: {
      revenue: curRev,
      cogs: curCogs,
      grossProfit: curProfit,
      marginPct: Math.round(curMargin * 10) / 10,
    },
    comparison: {
      prevRevenue: prevRev,
      prevCogs,
      prevGrossProfit: prevProfit,
      prevMarginPct: Math.round(prevMargin * 10) / 10,
      // Always in percentage points — NOT relative %
      marginDeltaPpts: Math.round((curMargin - prevMargin) * 10) / 10,
    },
    timeSeries: tsRows.map(r => {
      const rev    = asNumber(r.revenue);
      const cogs   = asNumber(r.cogs);
      const profit = rev - cogs;
      return {
        period: r.period.toISOString().slice(0, 10),
        revenue: rev,
        cogs,
        grossProfit: profit,
        marginPct: rev > 0 ? Math.round((profit / rev) * 1000) / 10 : 0,
      };
    }),
    topProductsByProfit: topRows.map(mapProduct),
    bottomProductsByMargin: lowRows.map(mapProduct),
  };
}

// ── Stock Sourcing Report ─────────────────────────────────────────────────────
// Percentage of stock received from each supplier over the last 90 days,
// derived from stock_movements (type=RECEIVED) joined to batches → suppliers.
export async function getStockSourcingReport(pharmacyId: string) {
  const cutoff = new Date(Date.now() - 90 * 86400000);

  const rows = await prisma.$queryRaw<Array<{
    supplier_id: string | null;
    supplier_name: string | null;
    units: number;
  }>>(Prisma.sql`
    SELECT
      s.id AS supplier_id,
      s.name AS supplier_name,
      SUM(sm.quantity)::int AS units
    FROM stock_movements sm
    LEFT JOIN batches b ON b.id = sm."batchId"
    LEFT JOIN suppliers s ON s.id = b."supplierId"
    WHERE sm."pharmacyId" = ${pharmacyId}
      AND sm.type = 'RECEIVED'
      AND sm."createdAt" >= ${cutoff}
    GROUP BY s.id, s.name
    ORDER BY units DESC
  `);

  const totalUnitsReceived = rows.reduce((sum, r) => sum + Number(r.units), 0);

  return {
    period: '90d',
    generatedAt: new Date().toISOString(),
    totalUnitsReceived,
    bySupplier: rows.map((r) => ({
      supplierId: r.supplier_id ?? null,
      supplierName: r.supplier_name ?? 'Unknown Supplier',
      units: Number(r.units),
      percentage: totalUnitsReceived > 0
        ? Math.round((Number(r.units) / totalUnitsReceived) * 1000) / 10
        : 0,
    })),
  };
}

// ── TFDA Dispensing Log ───────────────────────────────────────────────────────
// Returns rows for a TFDA-inspection-ready CSV of controlled/prescription drugs.
export async function getTfdaDispensingLog(
  pharmacyId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const to   = dateTo   ? new Date(dateTo)   : new Date();

  // The dispensing_events table stores items as a JSONB array. We cross-join
  // each item to extract per-line drug details. Products are joined from the
  // products table via the productId stored in each item JSON element.
  const rows = await prisma.$queryRaw<Array<{
    dispensed_date: Date;
    reference_number: string;
    product_name: string;
    generic_name: string | null;
    strength: string | null;
    dosage_form: string | null;
    drug_class: string | null;
    quantity: number;
    batch_number: string | null;
    prescription_ref: string | null;
    dispensed_by: string | null;
  }>>(Prisma.sql`
    SELECT
      de.created_at AS dispensed_date,
      de.reference_number,
      COALESCE(p.name, item.value->>'productName', item.value->>'genericName', 'Unknown') AS product_name,
      COALESCE(p."genericName", item.value->>'genericName') AS generic_name,
      p.strength,
      CAST(p."dosageForm" AS TEXT) AS dosage_form,
      CAST(p."drugClass" AS TEXT) AS drug_class,
      COALESCE((item.value->>'quantity')::int, 1) AS quantity,
      item.value->>'batchNumber' AS batch_number,
      de.prescription_ref,
      CONCAT(u."firstName", ' ', u."lastName") AS dispensed_by
    FROM dispensing_events de
    CROSS JOIN LATERAL jsonb_array_elements(de.items) AS item(value)
    LEFT JOIN products p ON p.id = (item.value->>'productId')::uuid
    LEFT JOIN users u ON u.id = de.dispensed_by
    WHERE de.pharmacy_id = ${pharmacyId}
      AND de.status = 'COMPLETED'
      AND de.created_at >= ${from}
      AND de.created_at <= ${to}
      AND (
        p."drugClass" IN ('CONTROLLED', 'NARCOTIC', 'PRESCRIPTION_ONLY')
        OR item.value->>'requiresPrescription' = 'true'
      )
    ORDER BY de.created_at ASC
    LIMIT 50000
  `);

  return rows.map((r) => ({
    date: r.dispensed_date.toISOString().slice(0, 10),
    referenceNumber: r.reference_number,
    productName: r.product_name,
    genericName: r.generic_name ?? '',
    strength: r.strength ?? '',
    dosageForm: r.dosage_form ?? '',
    drugClass: r.drug_class ?? '',
    quantity: Number(r.quantity),
    batchNumber: r.batch_number ?? '',
    prescriptionRef: r.prescription_ref ?? '',
    dispensedBy: r.dispensed_by ?? '',
  }));
}

// ── Payment method breakdown ──────────────────────────────────────────────────
export async function getPaymentBreakdownReport(pharmacyId: string, dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
  const to   = dateTo   ? new Date(dateTo)   : new Date();

  const rows = await prisma.$queryRaw<Array<{
    payment_method: string; transaction_count: number; total_revenue: string; percentage: string;
  }>>(Prisma.sql`
    WITH totals AS (
      SELECT COALESCE(SUM(total_amount),0) AS grand_total
      FROM dispensing_events
      WHERE pharmacy_id=${pharmacyId} AND status='COMPLETED'
        AND created_at>=${from} AND created_at<=${to}
    )
    SELECT payment_method, COUNT(*)::int AS transaction_count,
      COALESCE(SUM(total_amount),0)::text AS total_revenue,
      CASE WHEN (SELECT grand_total FROM totals)>0
        THEN ROUND(COALESCE(SUM(total_amount),0)/(SELECT grand_total FROM totals)*100,1)::text
        ELSE '0' END AS percentage
    FROM dispensing_events
    WHERE pharmacy_id=${pharmacyId} AND status='COMPLETED'
      AND created_at>=${from} AND created_at<=${to}
    GROUP BY payment_method ORDER BY SUM(total_amount) DESC
  `);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    breakdown: rows.map(r => ({
      paymentMethod: r.payment_method,
      transactionCount: Number(r.transaction_count),
      totalRevenue: asNumber(r.total_revenue),
      percentage: Number(r.percentage),
    })),
  };
}
