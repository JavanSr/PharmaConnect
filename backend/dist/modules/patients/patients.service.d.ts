import { PaymentMethod, Prisma } from '@prisma/client';
interface CreatePatientData {
    chronicConditions?: string[];
    allergyFlags?: Record<string, boolean>;
    activeMedications?: string[];
    optInMethod?: string;
}
interface CreateDispensingEventData {
    drugId: string;
    batchId?: string;
    quantity: number;
    dose?: string;
    icdCode?: string;
    counsellingNotes?: string;
    dispensedByUserId: string;
    paymentMethod?: PaymentMethod;
    paymentRef?: string;
}
interface WalkInDispensingData {
    productId: string;
    quantity: number;
    dose?: string;
    icdCode?: string;
    counsellingNotes?: string;
    dispensedByUserId: string;
    paymentMethod: PaymentMethod;
    paymentRef?: string;
    referenceNumber?: string;
}
interface InteractionAlertData {
    dispensingEventId: string;
    drugAId: string;
    drugBId: string;
    severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
    overridePin?: string;
    overrideReason?: string;
    overrideUserId?: string;
}
export declare class PatientService {
    createPatient(pharmacyId: string, data: CreatePatientData): Promise<{
        id: string;
        createdAt: Date;
        pharmacyId: string;
        chronicConditions: string[];
        allergyFlags: Prisma.JsonValue;
        activeMedications: string[];
        optInStatus: boolean;
        optInTimestamp: Date | null;
        optInMethod: string | null;
    }>;
    getPatient(id: string, pharmacyId: string): Promise<{
        id: string;
        createdAt: Date;
        pharmacyId: string;
        chronicConditions: string[];
        allergyFlags: Prisma.JsonValue;
        activeMedications: string[];
        optInStatus: boolean;
        optInTimestamp: Date | null;
        optInMethod: string | null;
    }>;
    updatePatientFlags(id: string, pharmacyId: string, data: {
        allergyFlags?: Record<string, boolean>;
        chronicConditions?: string[];
        activeMedications?: string[];
    }): Promise<{
        id: string;
        createdAt: Date;
        pharmacyId: string;
        chronicConditions: string[];
        allergyFlags: Prisma.JsonValue;
        activeMedications: string[];
        optInStatus: boolean;
        optInTimestamp: Date | null;
        optInMethod: string | null;
    }>;
    getPatientHistory(id: string, pharmacyId: string, limit?: number): Promise<({
        batch: {
            id: string;
            batchNumber: string;
            expiryDate: Date;
        } | null;
        drug: {
            id: string;
            genericName: string;
            drugClass: string | null;
            atcCode: string | null;
        };
        dispensedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        pharmacyId: string;
        batchId: string | null;
        quantity: number;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentRef: string | null;
        patientId: string;
        drugId: string;
        dose: string | null;
        icdCode: string | null;
        counsellingNotes: string | null;
        dispensedByUserId: string;
        dispensedAt: Date;
        isVoided: boolean;
        voidReason: string | null;
        voidedAt: Date | null;
        voidedByUserId: string | null;
        vfdReceiptNumber: string | null;
        vfdStatus: string;
    })[]>;
    checkDrugInteractions(patientId: string, newDrugId: string, pharmacyId: string): Promise<{
        severity: null;
        interactions: never[];
    } | {
        severity: import(".prisma/client").$Enums.InteractionSeverity;
        interactions: {
            id: string;
            drugA: {
                id: string;
                genericName: string;
            };
            drugB: {
                id: string;
                genericName: string;
            };
            severity: import(".prisma/client").$Enums.InteractionSeverity;
            description: string;
            clinicalConsequence: string | null;
            management: string | null;
        }[];
    }>;
    checkContraindications(patientId: string, drugId: string): Promise<string[]>;
    createDispensingEvent(patientId: string, pharmacyId: string, data: CreateDispensingEventData): Promise<{
        interactionWarnings: {
            id: string;
            drugA: {
                id: string;
                genericName: string;
            };
            drugB: {
                id: string;
                genericName: string;
            };
            severity: import(".prisma/client").$Enums.InteractionSeverity;
            description: string;
            clinicalConsequence: string | null;
            management: string | null;
        }[];
        contraindicationWarnings: string[];
        batch: {
            id: string;
            batchNumber: string;
        } | null;
        drug: {
            id: string;
            genericName: string;
        };
        dispensedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        id: string;
        pharmacyId: string;
        batchId: string | null;
        quantity: number;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentRef: string | null;
        patientId: string;
        drugId: string;
        dose: string | null;
        icdCode: string | null;
        counsellingNotes: string | null;
        dispensedByUserId: string;
        dispensedAt: Date;
        isVoided: boolean;
        voidReason: string | null;
        voidedAt: Date | null;
        voidedByUserId: string | null;
        vfdReceiptNumber: string | null;
        vfdStatus: string;
    }>;
    dispenseWalkIn(pharmacyId: string, data: WalkInDispensingData): Promise<{
        eventId: string;
        movementId: string;
        referenceNumber: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentRef: string | null;
        vfdReceiptNumber: string | null;
        vfdStatus: string;
        dispensedAt: Date;
    }>;
    dispenseWalkInCart(pharmacyId: string, data: {
        items: Array<Omit<WalkInDispensingData, 'dispensedByUserId' | 'paymentMethod' | 'paymentRef' | 'referenceNumber'>>;
        dispensedByUserId: string;
        paymentMethod: PaymentMethod;
        paymentRef?: string;
    }): Promise<{
        referenceNumber: string;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentRef: string | null;
        itemCount: number;
        totalAmount: number;
        vfdReceipts: {
            eventId: string;
            vfdReceiptNumber: string | null;
            vfdStatus: string;
        }[];
        lines: {
            eventId: string;
            movementId: string;
            referenceNumber: string;
            productName: string;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
            paymentRef: string | null;
            vfdReceiptNumber: string | null;
            vfdStatus: string;
            dispensedAt: Date;
        }[];
        dispensedAt: Date;
        createdAt: string;
    }>;
    voidDispensingEvent(eventId: string, patientId: string, pharmacyId: string, data: {
        voidReason: string;
        voidedByUserId: string;
    }): Promise<{
        id: string;
        pharmacyId: string;
        batchId: string | null;
        quantity: number;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentRef: string | null;
        patientId: string;
        drugId: string;
        dose: string | null;
        icdCode: string | null;
        counsellingNotes: string | null;
        dispensedByUserId: string;
        dispensedAt: Date;
        isVoided: boolean;
        voidReason: string | null;
        voidedAt: Date | null;
        voidedByUserId: string | null;
        vfdReceiptNumber: string | null;
        vfdStatus: string;
    }>;
    logInteractionAlert(data: InteractionAlertData): Promise<{
        id: string;
        drugAId: string;
        drugBId: string;
        severity: import(".prisma/client").$Enums.InteractionSeverity;
        overridePin: string | null;
        overrideReason: string | null;
        overrideUserId: string | null;
        alertedAt: Date;
        dispensingEventId: string;
    }>;
    searchIcd10(query: string, limit?: number): Promise<{
        id: string;
        code: string;
        description: string;
        category: string | null;
    }[]>;
    getCommonIcd10(pharmacyId: string, limit?: number): Promise<{
        code: string | null;
        count: number;
        description: string | null;
    }[]>;
}
export default PatientService;
//# sourceMappingURL=patients.service.d.ts.map