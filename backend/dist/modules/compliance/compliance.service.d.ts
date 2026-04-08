import { ComplianceStatus, ComplianceType, Prisma } from '@prisma/client';
interface ItemFilters {
    status?: ComplianceStatus;
    type?: ComplianceType;
}
export declare class ComplianceService {
    computeStatus(expiryDate: Date): ComplianceStatus;
    calculateHealthScore(pharmacyId: string): Promise<{
        score: number;
        breakdown: Record<import(".prisma/client").$Enums.ComplianceStatus, number>;
    }>;
    listItems(pharmacyId: string, filters: ItemFilters): Promise<{
        status: import(".prisma/client").$Enums.ComplianceStatus;
        assignedStaff: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        documents: {
            id: string;
            filename: string;
            uploadedAt: Date;
        }[];
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        updatedAt: Date;
        licenceNumber: string | null;
        type: import(".prisma/client").$Enums.ComplianceType;
        expiryDate: Date;
        notes: string | null;
        issuingBody: string;
        issueDate: Date | null;
        isNotApplicable: boolean;
        assignedStaffId: string | null;
    }[]>;
    createItem(pharmacyId: string, data: {
        type: ComplianceType;
        name: string;
        issuingBody: string;
        licenceNumber?: string;
        issueDate?: Date;
        expiryDate: Date;
        notes?: string;
        assignedStaffId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        updatedAt: Date;
        licenceNumber: string | null;
        status: import(".prisma/client").$Enums.ComplianceStatus;
        type: import(".prisma/client").$Enums.ComplianceType;
        expiryDate: Date;
        notes: string | null;
        issuingBody: string;
        issueDate: Date | null;
        isNotApplicable: boolean;
        assignedStaffId: string | null;
    }>;
    getItem(id: string, pharmacyId: string): Promise<({
        assignedStaff: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        documents: {
            id: string;
            complianceItemId: string;
            filename: string;
            fileUrl: string;
            fileSize: number;
            uploadedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        updatedAt: Date;
        licenceNumber: string | null;
        status: import(".prisma/client").$Enums.ComplianceStatus;
        type: import(".prisma/client").$Enums.ComplianceType;
        expiryDate: Date;
        notes: string | null;
        issuingBody: string;
        issueDate: Date | null;
        isNotApplicable: boolean;
        assignedStaffId: string | null;
    }) | null>;
    updateItem(id: string, pharmacyId: string, data: Prisma.ComplianceItemUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        pharmacyId: string;
        updatedAt: Date;
        licenceNumber: string | null;
        status: import(".prisma/client").$Enums.ComplianceStatus;
        type: import(".prisma/client").$Enums.ComplianceType;
        expiryDate: Date;
        notes: string | null;
        issuingBody: string;
        issueDate: Date | null;
        isNotApplicable: boolean;
        assignedStaffId: string | null;
    }>;
    getItemDocuments(itemId: string): Promise<{
        id: string;
        complianceItemId: string;
        filename: string;
        fileUrl: string;
        fileSize: number;
        uploadedAt: Date;
    }[]>;
    uploadDocument(itemId: string, file: {
        filename: string;
        path: string;
        size: number;
    }): Promise<{
        id: string;
        complianceItemId: string;
        filename: string;
        fileUrl: string;
        fileSize: number;
        uploadedAt: Date;
    }>;
    serveDocument(itemId: string, docId: string): Promise<{
        id: string;
        complianceItemId: string;
        filename: string;
        fileUrl: string;
        fileSize: number;
        uploadedAt: Date;
    }>;
    listStaffCredentials(pharmacyId: string): Promise<({
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        userId: string;
        pharmacyId: string;
        expiryDate: Date;
        credentialType: string;
        registrationNumber: string;
    })[]>;
    createStaffCredential(pharmacyId: string, data: {
        userId: string;
        credentialType: string;
        registrationNumber: string;
        expiryDate: Date;
    }): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        userId: string;
        pharmacyId: string;
        expiryDate: Date;
        credentialType: string;
        registrationNumber: string;
    }>;
    generateInspectionChecklist(pharmacyId: string, userId: string): Promise<{
        id: string;
        pharmacyId: string;
        items: Prisma.JsonValue;
        generatedAt: Date;
        generatedByUserId: string;
        pdfUrl: string | null;
    }>;
    getInspectionChecklist(id: string): Promise<{
        id: string;
        pharmacyId: string;
        items: Prisma.JsonValue;
        generatedAt: Date;
        generatedByUserId: string;
        pdfUrl: string | null;
    }>;
    listInspectionChecklists(pharmacyId: string): Promise<{
        id: string;
        pharmacyId: string;
        items: Prisma.JsonValue;
        generatedAt: Date;
        generatedByUserId: string;
        pdfUrl: string | null;
    }[]>;
    updateChecklistItem(checklistId: string, itemIndex: number, status: string, notes?: string): Promise<{
        id: string;
        pharmacyId: string;
        items: Prisma.JsonValue;
        generatedAt: Date;
        generatedByUserId: string;
        pdfUrl: string | null;
    }>;
}
export default ComplianceService;
//# sourceMappingURL=compliance.service.d.ts.map