import { ComplianceStatus, ComplianceType, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

interface ItemFilters {
  status?: ComplianceStatus;
  type?: ComplianceType;
}

export class ComplianceService {
  // ─── Status Computation ────────────────────────────────────────────────────

  computeStatus(expiryDate: Date): ComplianceStatus {
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days < 0) return ComplianceStatus.EXPIRED;
    if (days <= 7) return ComplianceStatus.RED;
    if (days <= 30) return ComplianceStatus.AMBER;
    return ComplianceStatus.GREEN;
  }

  // ─── Health Score ──────────────────────────────────────────────────────────

  async calculateHealthScore(pharmacyId: string) {
    const items = await prisma.complianceItem.findMany({
      where: { pharmacyId, isNotApplicable: false },
    });

    const breakdown: Record<ComplianceStatus, number> = {
      GREEN: 0,
      AMBER: 0,
      RED: 0,
      EXPIRED: 0,
    };

    for (const item of items) {
      const status = this.computeStatus(item.expiryDate);
      breakdown[status]++;
    }

    const total = items.length;
    if (total === 0) return { score: 100, breakdown };

    // Score: GREEN=100, AMBER=60, RED=20, EXPIRED=0 per item, averaged
    const weightedSum =
      breakdown.GREEN * 100 +
      breakdown.AMBER * 60 +
      breakdown.RED * 20 +
      breakdown.EXPIRED * 0;

    const score = Math.round(weightedSum / total);

    return { score, breakdown };
  }

  // ─── Compliance Items ──────────────────────────────────────────────────────

  async listItems(pharmacyId: string, filters: ItemFilters) {
    const where: Prisma.ComplianceItemWhereInput = { pharmacyId };
    if (filters.type) where.type = filters.type;

    const items = await prisma.complianceItem.findMany({
      where,
      include: {
        assignedStaff: { select: { id: true, firstName: true, lastName: true } },
        documents: { select: { id: true, filename: true, uploadedAt: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    // Recompute status on read and filter if needed
    const result = items.map((item) => ({
      ...item,
      status: this.computeStatus(item.expiryDate),
    }));

    if (filters.status) {
      return result.filter((item) => item.status === filters.status);
    }

    return result;
  }

  async createItem(
    pharmacyId: string,
    data: {
      type: ComplianceType;
      name: string;
      issuingBody: string;
      licenceNumber?: string;
      issueDate?: Date;
      expiryDate: Date;
      notes?: string;
      assignedStaffId?: string;
    }
  ) {
    const status = this.computeStatus(data.expiryDate);
    return prisma.complianceItem.create({
      data: {
        ...data,
        status,
        pharmacyId,
      },
    });
  }

  async getItem(id: string, pharmacyId: string) {
    return prisma.complianceItem.findFirst({
      where: { id, pharmacyId },
      include: {
        documents: { orderBy: { uploadedAt: 'desc' } },
        assignedStaff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateItem(
    id: string,
    pharmacyId: string,
    data: Prisma.ComplianceItemUpdateInput
  ) {
    const item = await prisma.complianceItem.findUnique({ where: { id, pharmacyId } });
    if (!item) throw new Error('Compliance item not found');

    let status = item.status;
    if (data.expiryDate) {
      status = this.computeStatus(new Date(data.expiryDate as string | Date));
    }

    return prisma.complianceItem.update({
      where: { id, pharmacyId },
      data: { ...data, status },
    });
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async getItemDocuments(itemId: string) {
    return prisma.complianceDocument.findMany({
      where: { complianceItemId: itemId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadDocument(
    itemId: string,
    file: { filename: string; path: string; size: number }
  ) {
    return prisma.complianceDocument.create({
      data: {
        complianceItemId: itemId,
        filename: file.filename,
        fileUrl: file.path,
        fileSize: file.size,
      },
    });
  }

  async serveDocument(itemId: string, docId: string) {
    const doc = await prisma.complianceDocument.findFirst({
      where: { id: docId, complianceItemId: itemId },
    });
    if (!doc) throw new Error('Document not found');
    return doc;
  }

  // ─── Staff Credentials ─────────────────────────────────────────────────────

  async listStaffCredentials(pharmacyId: string) {
    return prisma.staffCredential.findMany({
      where: { pharmacyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createStaffCredential(
    pharmacyId: string,
    data: {
      userId: string;
      credentialType: string;
      registrationNumber: string;
      expiryDate: Date;
    }
  ) {
    return prisma.staffCredential.create({
      data: {
        ...data,
        pharmacyId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Inspection Checklist ──────────────────────────────────────────────────

  async generateInspectionChecklist(pharmacyId: string, userId: string) {
    const checklistItems = [
      // Premises
      { category: 'Premises', item: 'Pharmacy premises are clean, tidy, and well-maintained', status: 'PENDING', notes: null },
      { category: 'Premises', item: 'Adequate lighting, ventilation, and temperature control in all areas', status: 'PENDING', notes: null },
      { category: 'Premises', item: 'Separate dispensary area clearly demarcated from public areas', status: 'PENDING', notes: null },
      { category: 'Premises', item: 'Handwashing facilities available in dispensing area', status: 'PENDING', notes: null },
      // Storage
      { category: 'Storage', item: 'Medicines stored at appropriate temperatures (ambient, refrigerated, frozen)', status: 'PENDING', notes: null },
      { category: 'Storage', item: 'Cold chain medicines stored in functional refrigerator (2–8°C)', status: 'PENDING', notes: null },
      { category: 'Storage', item: 'Medicines stored away from direct sunlight and moisture', status: 'PENDING', notes: null },
      { category: 'Storage', item: 'FEFO (First Expired, First Out) rotation practised', status: 'PENDING', notes: null },
      // Labelling
      { category: 'Labelling', item: 'All dispensed medicines carry patient name, dose, and directions', status: 'PENDING', notes: null },
      { category: 'Labelling', item: 'Labels are legible, accurate, and in patient\'s language where possible', status: 'PENDING', notes: null },
      { category: 'Labelling', item: 'Dispensed containers are appropriate and child-resistant where required', status: 'PENDING', notes: null },
      // Records
      { category: 'Records', item: 'Dispensing records maintained and accessible for at least 3 years', status: 'PENDING', notes: null },
      { category: 'Records', item: 'Prescription register up-to-date and accurate', status: 'PENDING', notes: null },
      { category: 'Records', item: 'Stock records (receipts, issues) accurately maintained', status: 'PENDING', notes: null },
      // Staff Qualifications
      { category: 'Staff Qualifications', item: 'Pharmacist-in-Charge present during operating hours', status: 'PENDING', notes: null },
      { category: 'Staff Qualifications', item: 'All dispensing staff hold valid Pharmacy Council registration', status: 'PENDING', notes: null },
      { category: 'Staff Qualifications', item: 'Staff CPD records up-to-date and meeting annual requirements', status: 'PENDING', notes: null },
      // Controlled Drugs
      { category: 'Controlled Drugs', item: 'Controlled drug register maintained with all required entries', status: 'PENDING', notes: null },
      { category: 'Controlled Drugs', item: 'Controlled drugs stored in locked, fixed, tamper-evident cabinet', status: 'PENDING', notes: null },
      // Cold Chain
      { category: 'Cold Chain', item: 'Temperature monitoring logs completed daily for cold storage', status: 'PENDING', notes: null },
      // Waste Disposal
      { category: 'Waste Disposal', item: 'Expired and unwanted medicines segregated and awaiting proper disposal', status: 'PENDING', notes: null },
      { category: 'Waste Disposal', item: 'Sharps containers in use and not overfilled', status: 'PENDING', notes: null },
      // Customer Service
      { category: 'Customer Service', item: 'Patient counselling provided with every dispensing', status: 'PENDING', notes: null },
      // Documentation
      { category: 'Documentation', item: 'TMDA premise licence displayed and valid', status: 'PENDING', notes: null },
      { category: 'Documentation', item: 'All compliance certificates current and filed', status: 'PENDING', notes: null },
    ];

    const checklist = await prisma.inspectionChecklist.create({
      data: {
        pharmacyId,
        generatedByUserId: userId,
        items: checklistItems,
      },
    });

    return checklist;
  }

  async getInspectionChecklist(id: string) {
    const checklist = await prisma.inspectionChecklist.findUnique({ where: { id } });
    if (!checklist) throw new Error('Checklist not found');
    return checklist;
  }

  async listInspectionChecklists(pharmacyId: string) {
    return prisma.inspectionChecklist.findMany({
      where: { pharmacyId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async updateChecklistItem(checklistId: string, itemIndex: number, status: string, notes?: string) {
    const checklist = await prisma.inspectionChecklist.findUnique({ where: { id: checklistId } });
    if (!checklist) throw new Error('Checklist not found');

    const items = checklist.items as Array<Record<string, unknown>>;
    if (itemIndex < 0 || itemIndex >= items.length) throw new Error('Invalid item index');

    items[itemIndex] = { ...items[itemIndex], status, notes: notes ?? items[itemIndex].notes ?? null };

    return prisma.inspectionChecklist.update({
      where: { id: checklistId },
      data: { items: items as Prisma.InputJsonValue },
    });
  }
}

export default ComplianceService;
