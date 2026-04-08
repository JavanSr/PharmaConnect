"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../lib/prisma"));
class ComplianceService {
    // ─── Status Computation ────────────────────────────────────────────────────
    computeStatus(expiryDate) {
        const now = new Date();
        const diff = expiryDate.getTime() - now.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 0)
            return client_1.ComplianceStatus.EXPIRED;
        if (days <= 7)
            return client_1.ComplianceStatus.RED;
        if (days <= 30)
            return client_1.ComplianceStatus.AMBER;
        return client_1.ComplianceStatus.GREEN;
    }
    // ─── Health Score ──────────────────────────────────────────────────────────
    async calculateHealthScore(pharmacyId) {
        const items = await prisma_1.default.complianceItem.findMany({
            where: { pharmacyId, isNotApplicable: false },
        });
        const breakdown = {
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
        if (total === 0)
            return { score: 100, breakdown };
        // Score: GREEN=100, AMBER=60, RED=20, EXPIRED=0 per item, averaged
        const weightedSum = breakdown.GREEN * 100 +
            breakdown.AMBER * 60 +
            breakdown.RED * 20 +
            breakdown.EXPIRED * 0;
        const score = Math.round(weightedSum / total);
        return { score, breakdown };
    }
    // ─── Compliance Items ──────────────────────────────────────────────────────
    async listItems(pharmacyId, filters) {
        const where = { pharmacyId };
        if (filters.type)
            where.type = filters.type;
        const items = await prisma_1.default.complianceItem.findMany({
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
    async createItem(pharmacyId, data) {
        const status = this.computeStatus(data.expiryDate);
        return prisma_1.default.complianceItem.create({
            data: {
                ...data,
                status,
                pharmacyId,
            },
        });
    }
    async getItem(id, pharmacyId) {
        return prisma_1.default.complianceItem.findFirst({
            where: { id, pharmacyId },
            include: {
                documents: { orderBy: { uploadedAt: 'desc' } },
                assignedStaff: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async updateItem(id, pharmacyId, data) {
        const item = await prisma_1.default.complianceItem.findUnique({ where: { id, pharmacyId } });
        if (!item)
            throw new Error('Compliance item not found');
        let status = item.status;
        if (data.expiryDate) {
            status = this.computeStatus(new Date(data.expiryDate));
        }
        return prisma_1.default.complianceItem.update({
            where: { id, pharmacyId },
            data: { ...data, status },
        });
    }
    // ─── Documents ─────────────────────────────────────────────────────────────
    async getItemDocuments(itemId) {
        return prisma_1.default.complianceDocument.findMany({
            where: { complianceItemId: itemId },
            orderBy: { uploadedAt: 'desc' },
        });
    }
    async uploadDocument(itemId, file) {
        return prisma_1.default.complianceDocument.create({
            data: {
                complianceItemId: itemId,
                filename: file.filename,
                fileUrl: file.path,
                fileSize: file.size,
            },
        });
    }
    async serveDocument(itemId, docId) {
        const doc = await prisma_1.default.complianceDocument.findFirst({
            where: { id: docId, complianceItemId: itemId },
        });
        if (!doc)
            throw new Error('Document not found');
        return doc;
    }
    // ─── Staff Credentials ─────────────────────────────────────────────────────
    async listStaffCredentials(pharmacyId) {
        return prisma_1.default.staffCredential.findMany({
            where: { pharmacyId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
            },
            orderBy: { expiryDate: 'asc' },
        });
    }
    async createStaffCredential(pharmacyId, data) {
        return prisma_1.default.staffCredential.create({
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
    async generateInspectionChecklist(pharmacyId, userId) {
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
        const checklist = await prisma_1.default.inspectionChecklist.create({
            data: {
                pharmacyId,
                generatedByUserId: userId,
                items: checklistItems,
            },
        });
        return checklist;
    }
    async getInspectionChecklist(id) {
        const checklist = await prisma_1.default.inspectionChecklist.findUnique({ where: { id } });
        if (!checklist)
            throw new Error('Checklist not found');
        return checklist;
    }
    async listInspectionChecklists(pharmacyId) {
        return prisma_1.default.inspectionChecklist.findMany({
            where: { pharmacyId },
            orderBy: { generatedAt: 'desc' },
        });
    }
    async updateChecklistItem(checklistId, itemIndex, status, notes) {
        const checklist = await prisma_1.default.inspectionChecklist.findUnique({ where: { id: checklistId } });
        if (!checklist)
            throw new Error('Checklist not found');
        const items = checklist.items;
        if (itemIndex < 0 || itemIndex >= items.length)
            throw new Error('Invalid item index');
        items[itemIndex] = { ...items[itemIndex], status, notes: notes ?? items[itemIndex].notes ?? null };
        return prisma_1.default.inspectionChecklist.update({
            where: { id: checklistId },
            data: { items: items },
        });
    }
}
exports.ComplianceService = ComplianceService;
exports.default = ComplianceService;
//# sourceMappingURL=compliance.service.js.map