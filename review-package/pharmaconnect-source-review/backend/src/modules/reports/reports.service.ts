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

export async function listAttendanceForUser(userId: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    attendance_date: Date;
    clock_in_at: Date | null;
    clock_out_at: Date | null;
    status: string;
    notes: string | null;
  }>>(Prisma.sql`
    SELECT *
    FROM "staff_attendance"
    WHERE "user_id" = ${userId}
    ORDER BY "attendance_date" DESC
    LIMIT 365
  `);

  return rows.map((row) => ({
    id: row.id,
    attendanceDate: row.attendance_date.toISOString().slice(0, 10),
    clockInAt: row.clock_in_at?.toISOString() ?? null,
    clockOutAt: row.clock_out_at?.toISOString() ?? null,
    status: row.status,
    notes: row.notes,
  }));
}

export async function listAttendanceForPharmacy(pharmacyId: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    attendance_date: Date;
    clock_in_at: Date | null;
    clock_out_at: Date | null;
    status: string;
    notes: string | null;
    user_id: string;
    first_name: string;
    last_name: string;
  }>>(Prisma.sql`
    SELECT
      sa.*,
      u."id" AS user_id,
      u."firstName" AS first_name,
      u."lastName" AS last_name
    FROM "staff_attendance" sa
    INNER JOIN "users" u ON u."id" = sa."user_id"
    WHERE sa."pharmacy_id" = ${pharmacyId}
    ORDER BY sa."attendance_date" DESC
    LIMIT 365
  `);

  return rows.map((row) => ({
    id: row.id,
    attendanceDate: row.attendance_date.toISOString().slice(0, 10),
    clockInAt: row.clock_in_at?.toISOString() ?? null,
    clockOutAt: row.clock_out_at?.toISOString() ?? null,
    status: row.status,
    notes: row.notes,
    user: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
    },
  }));
}
