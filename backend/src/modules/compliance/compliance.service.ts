import PDFDocument from 'pdfkit';
import {
  ComplianceCategory,
  type ComplianceDocument,
  type ComplianceItem,
  type ComplianceStatus,
  NotificationChannel,
  type Prisma,
  type StaffCredential,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { alertAlreadySentToday } from '../inventory/inventory.service';
import { getComplianceObjectUrl, storeComplianceObject } from './compliance.storage';

export const WHOLESALE_PERMIT_LICENCE_TYPE = 'WHOLESALE_PERMIT';
const COMPLIANCE_DOCUMENT_BUCKET = 'compliance-documents';
const INSPECTION_PDF_BUCKET = 'compliance-documents';
const ALERT_WINDOWS_DAYS = [90, 60, 30, 14, 7, 3, 1];
// TODO Phase 2: cold chain log UI and API

export type ComplianceRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'PHARMACIST_IN_CHARGE'
  | 'DISPENSER'
  | 'CASHIER'
  | 'WHOLESALE_MANAGER'
  | 'WHOLESALE_COUNTER_STAFF'
  | 'DELIVERY_STAFF'
  | 'WHOLESALE_SELLER';

export type InspectionChecklistItemStatus =
  | 'PENDING'
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'NOT_APPLICABLE';

export type InspectionChecklistItem = {
  category: string;
  item: string;
  status: InspectionChecklistItemStatus;
  notes: string | null;
};

export type ComplianceItemPayload = {
  type: string;
  name: string;
  issuingBody: string;
  licenceNumber?: string;
  issueDate?: string;
  expiryDate: string;
  notes?: string;
  description?: string;
};

export type StaffCredentialPayload = {
  userId?: string;
  credentialName: string;
  credentialNumber?: string;
  issuingBody?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
  notes?: string;
};

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function daysUntil(date: Date, reference = new Date()): number {
  return Math.ceil((startOfDay(date).getTime() - startOfDay(reference).getTime()) / 86_400_000);
}

function deriveStatus(item: Pick<ComplianceItem, 'dueDate' | 'isNotApplicable' | 'closedAt'>): ComplianceStatus {
  if (item.isNotApplicable || item.closedAt || !item.dueDate) {
    return 'GREEN';
  }

  const remainingDays = daysUntil(item.dueDate);
  if (remainingDays < 0) {
    return 'EXPIRED';
  }

  if (remainingDays <= 7) {
    return 'RED';
  }

  if (remainingDays <= 30) {
    return 'AMBER';
  }

  return 'GREEN';
}

function inferCategory(type: string): ComplianceCategory {
  switch (type) {
    case 'WHOLESALE_PERMIT':
    case 'TMDA_PREMISE':
    case 'PC_IN_CHARGE':
    case 'PC_TECHNOLOGIST':
    case 'DLDM_CERT':
    case 'COLD_CHAIN':
    case 'NARCOTICS':
    case 'BUSINESS_LICENCE':
      return 'LICENCE';
    default:
      return 'OTHER';
  }
}

function canManageWholesalePermit(role: ComplianceRole): boolean {
  return role === 'OWNER' || role === 'SUPER_ADMIN' || role === 'WHOLESALE_MANAGER' || role === 'WHOLESALE_COUNTER_STAFF';
}

function visibleItemWhere(role: ComplianceRole, pharmacyId: string): Prisma.ComplianceItemWhereInput {
  if (role === 'SUPER_ADMIN' || role === 'OWNER') {
    return { pharmacyId };
  }

  if (role === 'WHOLESALE_MANAGER' || role === 'WHOLESALE_COUNTER_STAFF') {
    return { pharmacyId, licenceType: WHOLESALE_PERMIT_LICENCE_TYPE };
  }

  return {
    pharmacyId,
    OR: [
      { licenceType: null },
      { licenceType: { not: WHOLESALE_PERMIT_LICENCE_TYPE } },
    ],
  };
}

function assertWholesalePermitAccess(role: ComplianceRole, licenceType: string): void {
  if (licenceType === WHOLESALE_PERMIT_LICENCE_TYPE && !canManageWholesalePermit(role)) {
    throw new Error('WHOLESALE_PERMIT_ACCESS_DENIED');
  }

  if ((role === 'WHOLESALE_MANAGER' || role === 'WHOLESALE_COUNTER_STAFF') && licenceType !== WHOLESALE_PERMIT_LICENCE_TYPE) {
    throw new Error('WHOLESALE_SCOPE_REQUIRED');
  }
}

function toComplianceItemDto(
  item: ComplianceItem & { _count?: { documents: number } },
  documentCount?: number,
) {
  return {
    id: item.id,
    pharmacyId: item.pharmacyId,
    title: item.title,
    name: item.title,
    type: item.licenceType ?? item.category,
    category: item.category,
    description: item.description,
    issuingBody: item.issuingBody,
    licenceNumber: item.referenceNumber,
    issueDate: item.renewalDate?.toISOString() ?? null,
    expiryDate: item.dueDate?.toISOString() ?? null,
    dueDate: item.dueDate?.toISOString() ?? null,
    renewalDate: item.renewalDate?.toISOString() ?? null,
    documentRef: item.documentRef,
    isNotApplicable: item.isNotApplicable,
    status: item.status,
    notes: item.notes,
    documents: [],
    _count: {
      documents: documentCount ?? item._count?.documents ?? 0,
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toDocumentDto(document: ComplianceDocument, fileUrl: string) {
  return {
    id: document.id,
    filename: document.fileName,
    fileUrl,
    uploadedAt: document.uploadedAt.toISOString(),
    mimeType: document.mimeType,
    fileSizeBytes: document.fileSizeBytes,
  };
}

function toStaffCredentialDto(credential: StaffCredential) {
  return {
    id: credential.id,
    pharmacyId: credential.pharmacyId,
    userId: credential.userId,
    credentialName: credential.credentialName,
    credentialNumber: credential.credentialNumber,
    issuingBody: credential.issuingBody,
    issuedAt: credential.issuedAt?.toISOString() ?? null,
    expiresAt: credential.expiresAt?.toISOString() ?? null,
    status: credential.status,
    notes: credential.notes,
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  };
}

function scoreInspectionItems(items: InspectionChecklistItem[]): number {
  const applicable = items.filter((item) => item.status !== 'NOT_APPLICABLE');
  if (applicable.length === 0) {
    return 100;
  }

  const compliant = applicable.filter((item) => item.status === 'COMPLIANT').length;
  return Math.round((compliant / applicable.length) * 100);
}

function renderChecklistPdf(input: {
  checklistId: string;
  generatedAt: Date;
  pharmacyName: string;
  items: InspectionChecklistItem[];
  scorePercentage: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 42, size: 'A4' });

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('TMDA Inspection Checklist');
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#4b5563').text(`Pharmacy: ${input.pharmacyName}`);
    doc.text(`Checklist ID: ${input.checklistId}`);
    doc.text(`Generated: ${input.generatedAt.toISOString()}`);
    doc.text(`Readiness score: ${input.scorePercentage}%`);
    doc.moveDown();

    for (const item of input.items) {
      doc.fontSize(11).fillColor('#111827').text(`${item.category}: ${item.item}`);
      doc.fontSize(10).fillColor('#4b5563').text(`Status: ${item.status}${item.notes ? ` | Notes: ${item.notes}` : ''}`);
      doc.moveDown(0.4);
    }

    doc.end();
  });
}

async function uploadChecklistPdf(
  pharmacyId: string,
  checklistId: string,
  generatedAt: Date,
  pharmacyName: string,
  items: InspectionChecklistItem[],
  scorePercentage: number,
): Promise<string> {
  const buffer = await renderChecklistPdf({
    checklistId,
    generatedAt,
    pharmacyName,
    items,
    scorePercentage,
  });

  const stored = await storeComplianceObject({
    bucket: INSPECTION_PDF_BUCKET,
    folder: `${pharmacyId}/inspection-checklists/${checklistId}`,
    fileName: `${checklistId}.pdf`,
    contentType: 'application/pdf',
    buffer,
  });

  return stored.filePath;
}

export async function refreshComplianceStatuses(pharmacyId?: string): Promise<number> {
  const items = await prisma.complianceItem.findMany({
    where: pharmacyId ? { pharmacyId } : undefined,
    select: {
      id: true,
      dueDate: true,
      isNotApplicable: true,
      closedAt: true,
      status: true,
    },
  });

  let updated = 0;

  for (const item of items) {
    const nextStatus = deriveStatus(item);
    if (item.status !== nextStatus) {
      await prisma.complianceItem.update({
        where: { id: item.id },
        data: { status: nextStatus },
      });
      updated += 1;
    }
  }

  return updated;
}

export async function listComplianceItems(input: {
  pharmacyId: string;
  role: ComplianceRole;
  status?: ComplianceStatus;
}) {
  await refreshComplianceStatuses(input.pharmacyId);

  const items = await prisma.complianceItem.findMany({
    where: {
      ...visibleItemWhere(input.role, input.pharmacyId),
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      _count: {
        select: { documents: true },
      },
    },
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' },
      { title: 'asc' },
    ],
  });

  return items.map((item) => toComplianceItemDto(item));
}

export async function getComplianceItemById(input: {
  itemId: string;
  pharmacyId: string;
  role: ComplianceRole;
}) {
  await refreshComplianceStatuses(input.pharmacyId);

  const item = await prisma.complianceItem.findFirst({
    where: {
      id: input.itemId,
      ...visibleItemWhere(input.role, input.pharmacyId),
    },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  return item ? toComplianceItemDto(item) : null;
}

export async function createComplianceItem(input: {
  pharmacyId: string;
  role: ComplianceRole;
  payload: ComplianceItemPayload;
}) {
  assertWholesalePermitAccess(input.role, input.payload.type);

  const item = await prisma.complianceItem.create({
    data: {
      pharmacyId: input.pharmacyId,
      title: input.payload.name,
      category: inferCategory(input.payload.type),
      description: input.payload.description,
      dueDate: new Date(input.payload.expiryDate),
      renewalDate: input.payload.issueDate ? new Date(input.payload.issueDate) : undefined,
      licenceType: input.payload.type,
      issuingBody: input.payload.issuingBody,
      referenceNumber: input.payload.licenceNumber,
      notes: input.payload.notes,
      status: deriveStatus({
        dueDate: new Date(input.payload.expiryDate),
        isNotApplicable: false,
        closedAt: null,
      }),
      roleScope:
        input.payload.type === WHOLESALE_PERMIT_LICENCE_TYPE
          ? ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF']
          : ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER'],
    },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  return toComplianceItemDto(item);
}

export async function updateComplianceItem(input: {
  itemId: string;
  pharmacyId: string;
  role: ComplianceRole;
  payload: Partial<ComplianceItemPayload> & { isNotApplicable?: boolean };
}) {
  const existing = await prisma.complianceItem.findFirst({
    where: {
      id: input.itemId,
      ...visibleItemWhere(input.role, input.pharmacyId),
    },
  });

  if (!existing) {
    return null;
  }

  const nextType = input.payload.type ?? existing.licenceType ?? existing.category;
  if (typeof nextType === 'string') {
    assertWholesalePermitAccess(input.role, nextType);
  }

  const nextDueDate =
    input.payload.expiryDate !== undefined
      ? new Date(input.payload.expiryDate)
      : existing.dueDate;
  const nextClosedAt =
    input.payload.isNotApplicable === true
      ? new Date()
      : input.payload.isNotApplicable === false
        ? null
        : existing.closedAt;
  const nextIsNotApplicable = input.payload.isNotApplicable ?? existing.isNotApplicable;

  const item = await prisma.complianceItem.update({
    where: { id: existing.id },
    data: {
      ...(input.payload.name !== undefined ? { title: input.payload.name } : {}),
      ...(input.payload.description !== undefined ? { description: input.payload.description } : {}),
      ...(input.payload.expiryDate !== undefined ? { dueDate: nextDueDate } : {}),
      ...(input.payload.issueDate !== undefined
        ? { renewalDate: input.payload.issueDate ? new Date(input.payload.issueDate) : null }
        : {}),
      ...(input.payload.type !== undefined ? { licenceType: input.payload.type, category: inferCategory(input.payload.type) } : {}),
      ...(input.payload.issuingBody !== undefined ? { issuingBody: input.payload.issuingBody } : {}),
      ...(input.payload.licenceNumber !== undefined ? { referenceNumber: input.payload.licenceNumber } : {}),
      ...(input.payload.notes !== undefined ? { notes: input.payload.notes } : {}),
      ...(input.payload.isNotApplicable !== undefined
        ? {
            isNotApplicable: nextIsNotApplicable,
            closedAt: nextClosedAt,
          }
        : {}),
      status: deriveStatus({
        dueDate: nextDueDate,
        isNotApplicable: nextIsNotApplicable,
        closedAt: nextClosedAt,
      }),
    },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  return toComplianceItemDto(item);
}

export async function deleteComplianceItem(input: {
  itemId: string;
  pharmacyId: string;
  role: ComplianceRole;
}) {
  const existing = await prisma.complianceItem.findFirst({
    where: {
      id: input.itemId,
      ...visibleItemWhere(input.role, input.pharmacyId),
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.complianceItem.delete({ where: { id: existing.id } });
  return true;
}

export async function getComplianceHealthScore(input: {
  pharmacyId: string;
  role: ComplianceRole;
}) {
  const items = await listComplianceItems(input);
  const applicableItems = items.filter((item) => !item.isNotApplicable);
  const breakdown = {
    GREEN: applicableItems.filter((item) => item.status === 'GREEN').length,
    AMBER: applicableItems.filter((item) => item.status === 'AMBER').length,
    RED: applicableItems.filter((item) => item.status === 'RED').length,
    EXPIRED: applicableItems.filter((item) => item.status === 'EXPIRED').length,
  };
  const weightedScore =
    breakdown.GREEN * 1 +
    breakdown.AMBER * 0.6 +
    breakdown.RED * 0.25;
  const score =
    applicableItems.length === 0
      ? 100
      : Math.round((weightedScore / applicableItems.length) * 100);

  return {
    score,
    total: items.length,
    applicable: applicableItems.length,
    breakdown,
    generatedAt: new Date().toISOString(),
  };
}

export async function listComplianceDocuments(input: {
  itemId: string;
  pharmacyId: string;
  role: ComplianceRole;
}) {
  const item = await prisma.complianceItem.findFirst({
    where: {
      id: input.itemId,
      ...visibleItemWhere(input.role, input.pharmacyId),
    },
    select: { id: true },
  });

  if (!item) {
    return null;
  }

  const docs = await prisma.complianceDocument.findMany({
    where: { complianceItemId: item.id },
    orderBy: { uploadedAt: 'desc' },
  });

  return Promise.all(
    docs.map(async (doc) => toDocumentDto(doc, await getComplianceObjectUrl(doc.storageBucket, doc.filePath))),
  );
}

export async function uploadComplianceDocument(input: {
  itemId: string;
  pharmacyId: string;
  role: ComplianceRole;
  uploadedBy: string;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
}) {
  const item = await prisma.complianceItem.findFirst({
    where: {
      id: input.itemId,
      ...visibleItemWhere(input.role, input.pharmacyId),
    },
  });

  if (!item) {
    return null;
  }

  const stored = await storeComplianceObject({
    bucket: COMPLIANCE_DOCUMENT_BUCKET,
    folder: `${input.pharmacyId}/${input.itemId}`,
    fileName: input.file.originalname,
    contentType: input.file.mimetype,
    buffer: input.file.buffer,
  });

  const document = await prisma.complianceDocument.create({
    data: {
      complianceItemId: item.id,
      uploadedBy: input.uploadedBy,
      fileName: input.file.originalname,
      filePath: stored.filePath,
      storageBucket: stored.bucket,
      mimeType: input.file.mimetype,
      fileSizeBytes: input.file.size,
      signedUrlExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await prisma.complianceItem.update({
    where: { id: item.id },
    data: { documentRef: document.filePath },
  });

  return toDocumentDto(document, stored.url);
}

export async function listStaffCredentials(pharmacyId: string) {
  const credentials = await prisma.staffCredential.findMany({
    where: { pharmacyId },
    orderBy: [{ expiresAt: 'asc' }, { credentialName: 'asc' }],
  });

  return credentials.map(toStaffCredentialDto);
}

export async function createStaffCredential(input: {
  pharmacyId: string;
  payload: StaffCredentialPayload;
}) {
  const credential = await prisma.staffCredential.create({
    data: {
      pharmacyId: input.pharmacyId,
      userId: input.payload.userId,
      credentialName: input.payload.credentialName,
      credentialNumber: input.payload.credentialNumber,
      issuingBody: input.payload.issuingBody,
      issuedAt: input.payload.issuedAt ? new Date(input.payload.issuedAt) : undefined,
      expiresAt: input.payload.expiresAt ? new Date(input.payload.expiresAt) : undefined,
      status: input.payload.status ?? 'ACTIVE',
      notes: input.payload.notes,
    },
  });

  return toStaffCredentialDto(credential);
}

export async function updateStaffCredential(input: {
  credentialId: string;
  pharmacyId: string;
  payload: Partial<StaffCredentialPayload>;
}) {
  const existing = await prisma.staffCredential.findFirst({
    where: {
      id: input.credentialId,
      pharmacyId: input.pharmacyId,
    },
  });

  if (!existing) {
    return null;
  }

  const credential = await prisma.staffCredential.update({
    where: { id: existing.id },
    data: {
      ...(input.payload.userId !== undefined ? { userId: input.payload.userId || null } : {}),
      ...(input.payload.credentialName !== undefined ? { credentialName: input.payload.credentialName } : {}),
      ...(input.payload.credentialNumber !== undefined ? { credentialNumber: input.payload.credentialNumber } : {}),
      ...(input.payload.issuingBody !== undefined ? { issuingBody: input.payload.issuingBody } : {}),
      ...(input.payload.issuedAt !== undefined ? { issuedAt: input.payload.issuedAt ? new Date(input.payload.issuedAt) : null } : {}),
      ...(input.payload.expiresAt !== undefined ? { expiresAt: input.payload.expiresAt ? new Date(input.payload.expiresAt) : null } : {}),
      ...(input.payload.status !== undefined ? { status: input.payload.status } : {}),
      ...(input.payload.notes !== undefined ? { notes: input.payload.notes } : {}),
    },
  });

  return toStaffCredentialDto(credential);
}

export async function deleteStaffCredential(input: {
  credentialId: string;
  pharmacyId: string;
}) {
  const existing = await prisma.staffCredential.findFirst({
    where: {
      id: input.credentialId,
      pharmacyId: input.pharmacyId,
    },
  });

  if (!existing) {
    return false;
  }

  await prisma.staffCredential.delete({ where: { id: existing.id } });
  return true;
}

export async function listInspectionChecklists(pharmacyId: string) {
  const checklists = await prisma.inspectionChecklist.findMany({
    where: { pharmacyId },
    orderBy: { generatedAt: 'desc' },
  });

  return Promise.all(
    checklists.map(async (checklist) => ({
      id: checklist.id,
      checklistType: checklist.checklistType,
      scorePercentage: checklist.scorePercentage,
      status: checklist.status,
      generatedAt: checklist.generatedAt.toISOString(),
      pdfUrl: checklist.pdfPath
        ? await getComplianceObjectUrl(INSPECTION_PDF_BUCKET, checklist.pdfPath)
        : null,
    })),
  );
}

export async function getInspectionChecklist(input: {
  checklistId: string;
  pharmacyId: string;
}) {
  const checklist = await prisma.inspectionChecklist.findFirst({
    where: {
      id: input.checklistId,
      pharmacyId: input.pharmacyId,
    },
  });

  if (!checklist) {
    return null;
  }

  return {
    id: checklist.id,
    checklistType: checklist.checklistType,
    scorePercentage: checklist.scorePercentage,
    status: checklist.status,
    items: (checklist.items as unknown as InspectionChecklistItem[]) ?? [],
    generatedAt: checklist.generatedAt.toISOString(),
    pdfUrl: checklist.pdfPath
      ? await getComplianceObjectUrl(INSPECTION_PDF_BUCKET, checklist.pdfPath)
      : null,
  };
}

export async function generateInspectionChecklist(input: {
  pharmacyId: string;
  generatedBy: string;
}) {
  const templates = await prisma.inspectionChecklistTemplate.findMany({
    where: { checklistType: 'TMDA_STANDARD' },
    orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }, { item: 'asc' }],
  });

  const items: InspectionChecklistItem[] = templates.map((template) => ({
    category: template.category,
    item: template.item,
    status: 'PENDING',
    notes: null,
  }));

  const checklist = await prisma.inspectionChecklist.create({
    data: {
      pharmacyId: input.pharmacyId,
      generatedBy: input.generatedBy,
      checklistType: 'TMDA_STANDARD',
      items: items as unknown as Prisma.InputJsonValue,
      status: 'DRAFT',
      scorePercentage: scoreInspectionItems(items),
    },
  });

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: input.pharmacyId },
    select: { name: true },
  });

  const pdfPath = await uploadChecklistPdf(
    input.pharmacyId,
    checklist.id,
    checklist.generatedAt,
    pharmacy?.name ?? 'APOTEKH Pharmacy',
    items,
    checklist.scorePercentage,
  );

  const updated = await prisma.inspectionChecklist.update({
    where: { id: checklist.id },
    data: { pdfPath },
  });

  return {
    id: updated.id,
    checklistType: updated.checklistType,
    scorePercentage: updated.scorePercentage,
    status: updated.status,
    items,
    generatedAt: updated.generatedAt.toISOString(),
    pdfUrl: await getComplianceObjectUrl(INSPECTION_PDF_BUCKET, pdfPath),
  };
}

export async function updateInspectionChecklistItem(input: {
  checklistId: string;
  pharmacyId: string;
  itemIndex: number;
  status: InspectionChecklistItemStatus;
  notes?: string;
}) {
  const checklist = await prisma.inspectionChecklist.findFirst({
    where: {
      id: input.checklistId,
      pharmacyId: input.pharmacyId,
    },
  });

  if (!checklist) {
    return null;
  }

  const currentItems = ((checklist.items as unknown as InspectionChecklistItem[]) ?? []).map((item) => ({
    category: item.category,
    item: item.item,
    status: item.status,
    notes: item.notes ?? null,
  }));

  if (!currentItems[input.itemIndex]) {
    throw new Error('CHECKLIST_ITEM_NOT_FOUND');
  }

  currentItems[input.itemIndex] = {
    ...currentItems[input.itemIndex],
    status: input.status,
    notes: input.status === 'NON_COMPLIANT' ? input.notes?.trim() || null : null,
  };

  const scorePercentage = scoreInspectionItems(currentItems);
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: input.pharmacyId },
    select: { name: true },
  });
  const pdfPath = await uploadChecklistPdf(
    input.pharmacyId,
    checklist.id,
    checklist.generatedAt,
    pharmacy?.name ?? 'APOTEKH Pharmacy',
    currentItems,
    scorePercentage,
  );

  const updated = await prisma.inspectionChecklist.update({
    where: { id: checklist.id },
    data: {
      items: currentItems as unknown as Prisma.InputJsonValue,
      scorePercentage,
      status: scorePercentage >= 80 ? 'READY' : 'IN_PROGRESS',
      pdfPath,
    },
  });

  return {
    id: updated.id,
    checklistType: updated.checklistType,
    scorePercentage: updated.scorePercentage,
    status: updated.status,
    items: currentItems,
    generatedAt: updated.generatedAt.toISOString(),
    pdfUrl: await getComplianceObjectUrl(INSPECTION_PDF_BUCKET, pdfPath),
  };
}

async function queueComplianceAlert(input: {
  pharmacyId: string;
  referenceId: string;
  referenceType: string;
  alertType: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  metadata: Prisma.JsonObject;
  recipientUserId: string;
  recipientLabel: string;
  complianceItemId?: string;
  daysBeforeExpiry?: number;
}) {
  const existing = await alertAlreadySentToday(input.pharmacyId, input.referenceId, input.channel);
  if (existing) {
    return false;
  }

  await prisma.alertLog.create({
    data: {
      pharmacyId: input.pharmacyId,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      alertType: input.alertType,
      channel: input.channel,
      recipient: input.recipientLabel,
      status: 'QUEUED',
      metadata: input.metadata,
      sentAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      pharmacyId: input.pharmacyId,
      userId: input.recipientUserId,
      type: input.alertType,
      title: input.title,
      body: input.body,
      metadata: input.metadata,
    },
  });

  if (input.complianceItemId) {
    await prisma.complianceAlert.create({
      data: {
        pharmacyId: input.pharmacyId,
        complianceItemId: input.complianceItemId,
        recipientUserId: input.recipientUserId,
        channel: input.channel,
        daysBeforeExpiry: input.daysBeforeExpiry,
        status: 'QUEUED',
        sentAt: new Date(),
      },
    });
  }

  return true;
}

export async function runComplianceAlerts(): Promise<{ queued: number }> {
  await refreshComplianceStatuses();

  const picRecipients = await prisma.user.findMany({
    where: {
      role: 'PHARMACIST_IN_CHARGE',
      isActive: true,
      pharmacyId: { not: null },
    },
    select: {
      id: true,
      pharmacyId: true,
      firstName: true,
      lastName: true,
    },
  });

  const picByPharmacy = new Map<string, (typeof picRecipients)[number]>();
  for (const recipient of picRecipients) {
    if (recipient.pharmacyId && !picByPharmacy.has(recipient.pharmacyId)) {
      picByPharmacy.set(recipient.pharmacyId, recipient);
    }
  }

  let queued = 0;
  const complianceItems = await prisma.complianceItem.findMany({
    where: {
      isNotApplicable: false,
      closedAt: null,
      dueDate: { not: null },
    },
  });

  for (const item of complianceItems) {
    if (!item.dueDate) {
      continue;
    }

    const recipient = picByPharmacy.get(item.pharmacyId);
    if (!recipient) {
      continue;
    }

    const remainingDays = daysUntil(item.dueDate);
    const shouldAlert = remainingDays < 0 || ALERT_WINDOWS_DAYS.includes(remainingDays);
    if (!shouldAlert) {
      continue;
    }

    const created = await queueComplianceAlert({
      pharmacyId: item.pharmacyId,
      referenceId: item.id,
      referenceType: 'COMPLIANCE_ITEM',
      alertType: remainingDays < 0 ? 'COMPLIANCE_EXPIRED' : `COMPLIANCE_${remainingDays}_DAY`,
      channel: NotificationChannel.IN_APP,
      title: remainingDays < 0 ? 'Compliance item expired' : 'Compliance item nearing expiry',
      body:
        remainingDays < 0
          ? `${item.title} expired and needs attention.`
          : `${item.title} expires in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`,
      metadata: {
        complianceItemId: item.id,
        title: item.title,
        dueDate: item.dueDate.toISOString(),
        status: item.status,
      },
      recipientUserId: recipient.id,
      recipientLabel: `${recipient.firstName} ${recipient.lastName}`.trim(),
      complianceItemId: item.id,
      daysBeforeExpiry: remainingDays,
    });

    if (created) {
      await prisma.complianceItem.update({
        where: { id: item.id },
        data: { lastAlertSentAt: new Date() },
      });
      queued += 1;
    }
  }

  const credentials = await prisma.staffCredential.findMany({
    where: {
      expiresAt: { not: null },
      status: { not: 'CLOSED' },
    },
  });

  for (const credential of credentials) {
    if (!credential.expiresAt) {
      continue;
    }

    const recipient = picByPharmacy.get(credential.pharmacyId);
    if (!recipient) {
      continue;
    }

    const remainingDays = daysUntil(credential.expiresAt);
    const shouldAlert = remainingDays < 0 || ALERT_WINDOWS_DAYS.includes(remainingDays);
    if (!shouldAlert) {
      continue;
    }

    const created = await queueComplianceAlert({
      pharmacyId: credential.pharmacyId,
      referenceId: credential.id,
      referenceType: 'STAFF_CREDENTIAL',
      alertType: remainingDays < 0 ? 'STAFF_CREDENTIAL_EXPIRED' : `STAFF_CREDENTIAL_${remainingDays}_DAY`,
      channel: NotificationChannel.IN_APP,
      title: remainingDays < 0 ? 'Staff credential expired' : 'Staff credential nearing expiry',
      body:
        remainingDays < 0
          ? `${credential.credentialName} has expired and needs renewal.`
          : `${credential.credentialName} expires in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`,
      metadata: {
        credentialId: credential.id,
        credentialName: credential.credentialName,
        expiresAt: credential.expiresAt.toISOString(),
      },
      recipientUserId: recipient.id,
      recipientLabel: `${recipient.firstName} ${recipient.lastName}`.trim(),
      daysBeforeExpiry: remainingDays,
    });

    if (created) {
      queued += 1;
    }
  }

  return { queued };
}

export async function ensureChecklistTemplatesSeeded(): Promise<number> {
  const existingCount = await prisma.inspectionChecklistTemplate.count({
    where: { checklistType: 'TMDA_STANDARD' },
  });

  if (existingCount > 0) {
    return existingCount;
  }

  const templates = [
    ['Licensing', 'Valid TMDA premise licence is displayed prominently', 10],
    ['Licensing', 'Pharmacist-in-charge registration is current and visible', 20],
    ['Premises', 'Premises are clean, well lit, and structurally sound', 30],
    ['Premises', 'Restricted access areas are secure and clearly marked', 40],
    ['Storage', 'Temperature-sensitive medicines are stored within required range', 50],
    ['Storage', 'Expired and damaged stock is segregated from saleable stock', 60],
    ['Records', 'Stock cards or electronic movement logs are up to date', 70],
    ['Records', 'Supplier invoices and batch traceability records are available', 80],
    ['Operations', 'Standard operating procedures are available to staff', 90],
    ['Operations', 'Recall and incident response process is documented', 100],
    ['Safety', 'Fire safety equipment is available and within inspection date', 110],
    ['Safety', 'Cold-chain contingency and power backup plans are documented', 120],
  ] as const;

  await prisma.inspectionChecklistTemplate.createMany({
    data: templates.map(([category, item, sortOrder]) => ({
      checklistType: 'TMDA_STANDARD',
      category,
      item,
      sortOrder,
    })),
    skipDuplicates: true,
  });

  return prisma.inspectionChecklistTemplate.count({
    where: { checklistType: 'TMDA_STANDARD' },
  });
}
