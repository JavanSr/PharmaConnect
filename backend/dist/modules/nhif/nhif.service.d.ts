import { NhifClaimStatus, Prisma } from '@prisma/client';
interface ClaimFilters {
    status?: NhifClaimStatus;
    dateFrom?: Date;
    dateTo?: Date;
}
interface Pagination {
    page: number;
    limit: number;
}
interface CreateClaimData {
    nhifCardNumber: string;
    memberName?: string;
    memberStatus?: string;
    scheme?: string;
    icdCode: string;
    drugCode?: string;
    quantity: number;
    claimedAmount: number;
    patientId: string;
}
interface ScrubResult {
    passed: boolean;
    score: number;
    failures: {
        rule: string;
        message: string;
    }[];
}
export declare class NhifClaimsService {
    verifyMember(cardNumber: string): Promise<{
        encryptedCardNumber: string;
        verification: import("../../services/nhif.service").NhifCardVerification;
        details: unknown[] | Record<string, unknown>;
    }>;
    createClaim(dispensingEventId: string, pharmacyId: string, data: CreateClaimData): Promise<{
        patient: {
            id: string;
        };
        dispensingEvent: {
            id: string;
            dispensedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        pharmacyId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.NhifClaimStatus;
        quantity: number;
        patientId: string;
        icdCode: string;
        vfdReceiptNumber: string | null;
        dispensingEventId: string;
        nhifCardNumber: string;
        memberName: string | null;
        memberStatus: string | null;
        scheme: string | null;
        drugCode: string | null;
        claimedAmount: number;
        nhifReferenceNumber: string | null;
        rejectionCode: string | null;
        rejectionReason: string | null;
        submittedAt: Date | null;
        approvedAt: Date | null;
    }>;
    scrubClaim(claimId: string): Promise<ScrubResult>;
    listClaims(pharmacyId: string, filters: ClaimFilters, pagination: Pagination): Promise<{
        data: ({
            dispensingEvent: {
                id: string;
                dispensedAt: Date;
            };
            scrubResults: {
                id: string;
                claimId: string;
                passed: boolean;
                rule: string;
                errorMessage: string | null;
                checkedAt: Date;
            }[];
        } & {
            id: string;
            createdAt: Date;
            pharmacyId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.NhifClaimStatus;
            quantity: number;
            patientId: string;
            icdCode: string;
            vfdReceiptNumber: string | null;
            dispensingEventId: string;
            nhifCardNumber: string;
            memberName: string | null;
            memberStatus: string | null;
            scheme: string | null;
            drugCode: string | null;
            claimedAmount: number;
            nhifReferenceNumber: string | null;
            rejectionCode: string | null;
            rejectionReason: string | null;
            submittedAt: Date | null;
            approvedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getClaim(id: string, pharmacyId: string): Promise<({
        scrubResults: {
            id: string;
            claimId: string;
            passed: boolean;
            rule: string;
            errorMessage: string | null;
            checkedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
        pharmacyId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.NhifClaimStatus;
        quantity: number;
        patientId: string;
        icdCode: string;
        vfdReceiptNumber: string | null;
        dispensingEventId: string;
        nhifCardNumber: string;
        memberName: string | null;
        memberStatus: string | null;
        scheme: string | null;
        drugCode: string | null;
        claimedAmount: number;
        nhifReferenceNumber: string | null;
        rejectionCode: string | null;
        rejectionReason: string | null;
        submittedAt: Date | null;
        approvedAt: Date | null;
    }) | null>;
    updateClaim(id: string, pharmacyId: string, data: Prisma.NhifClaimUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        pharmacyId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.NhifClaimStatus;
        quantity: number;
        patientId: string;
        icdCode: string;
        vfdReceiptNumber: string | null;
        dispensingEventId: string;
        nhifCardNumber: string;
        memberName: string | null;
        memberStatus: string | null;
        scheme: string | null;
        drugCode: string | null;
        claimedAmount: number;
        nhifReferenceNumber: string | null;
        rejectionCode: string | null;
        rejectionReason: string | null;
        submittedAt: Date | null;
        approvedAt: Date | null;
    }>;
    submitBatch(pharmacyId: string, claimIds: string[]): Promise<{
        batch: {
            status: string;
            totalAmount: number;
            id: string;
            createdAt: Date;
            pharmacyId: string;
            submittedAt: Date | null;
            claimIds: string[];
            nhifBatchReference: string | null;
            totalClaims: number;
        };
        approved: number;
        rejected: number;
        rejectedIds: string[];
    }>;
    getBatchStatus(nhifBatchReference: string): Promise<{
        nhifStatus: unknown[] | Record<string, unknown>;
        localBatch: {
            id: string;
            createdAt: Date;
            pharmacyId: string;
            status: string;
            totalAmount: number;
            submittedAt: Date | null;
            claimIds: string[];
            nhifBatchReference: string | null;
            totalClaims: number;
        } | null;
    }>;
    generateVfdReceipt(dispensingEventId: string): Promise<import("../../services/vfd.service").VfdReceiptResponse>;
    getAnalytics(pharmacyId: string, dateRange: {
        from: Date;
        to: Date;
    }): Promise<{
        total: number;
        approved: number;
        rejected: number;
        pending: number;
        successRate: number;
        topRejectionReasons: {
            code: string;
            reason: string;
            count: number;
        }[];
    }>;
}
export default NhifClaimsService;
//# sourceMappingURL=nhif.service.d.ts.map