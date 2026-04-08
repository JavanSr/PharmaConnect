import { PaymentMethod, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import VfdService from '../../services/vfd.service';

const vfdService = new VfdService();

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

export class PatientService {
  // ─── Create Patient ────────────────────────────────────────────────────────

  async createPatient(pharmacyId: string, data: CreatePatientData) {
    const patient = await prisma.patient.create({
      data: {
        chronicConditions: data.chronicConditions ?? [],
        allergyFlags: (data.allergyFlags ?? {}) as Prisma.InputJsonValue,
        activeMedications: data.activeMedications ?? [],
        optInStatus: true,
        optInTimestamp: new Date(),
        optInMethod: data.optInMethod ?? 'VERBAL',
        pharmacyId,
      },
    });

    logger.info(`Patient created: ${patient.id} for pharmacy ${pharmacyId}`);
    return patient;
  }

  // ─── Get Patient (no PII) ─────────────────────────────────────────────────

  async getPatient(id: string, pharmacyId: string) {
    const patient = await prisma.patient.findFirst({
      where: { id, pharmacyId },
      select: {
        id: true,
        chronicConditions: true,
        allergyFlags: true,
        activeMedications: true,
        optInStatus: true,
        optInTimestamp: true,
        optInMethod: true,
        createdAt: true,
        pharmacyId: true,
      },
    });
    if (!patient) throw new Error('Patient not found');
    return patient;
  }

  // ─── Update Patient Flags ─────────────────────────────────────────────────

  async updatePatientFlags(
    id: string,
    pharmacyId: string,
    data: {
      allergyFlags?: Record<string, boolean>;
      chronicConditions?: string[];
      activeMedications?: string[];
    }
  ) {
    const patient = await prisma.patient.findFirst({ where: { id, pharmacyId } });
    if (!patient) throw new Error('Patient not found');

    return prisma.patient.update({
      where: { id },
      data: {
        ...(data.allergyFlags !== undefined && {
          allergyFlags: data.allergyFlags as Prisma.InputJsonValue,
        }),
        ...(data.chronicConditions !== undefined && {
          chronicConditions: data.chronicConditions,
        }),
        ...(data.activeMedications !== undefined && {
          activeMedications: data.activeMedications,
        }),
      },
    });
  }

  // ─── Patient Dispensing History ────────────────────────────────────────────

  async getPatientHistory(id: string, pharmacyId: string, limit = 50) {
    const patient = await prisma.patient.findFirst({ where: { id, pharmacyId } });
    if (!patient) throw new Error('Patient not found');

    return prisma.dispensingEvent.findMany({
      where: { patientId: id, pharmacyId, isVoided: false },
      include: {
        drug: { select: { id: true, genericName: true, drugClass: true, atcCode: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dispensedAt: 'desc' },
      take: limit,
    });
  }

  // ─── Drug Interaction Check ────────────────────────────────────────────────

  async checkDrugInteractions(patientId: string, newDrugId: string, pharmacyId: string) {
    // Get last 90 days dispensing events for this patient
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentEvents = await prisma.dispensingEvent.findMany({
      where: {
        patientId,
        pharmacyId,
        isVoided: false,
        dispensedAt: { gte: ninetyDaysAgo },
      },
      select: { drugId: true },
    });

    const activeDrugIds = [...new Set(recentEvents.map((e) => e.drugId))].filter(
      (id) => id !== newDrugId
    );

    if (activeDrugIds.length === 0) return { severity: null, interactions: [] };

    // Indexed query for interactions
    const interactions = await prisma.drugInteraction.findMany({
      where: {
        OR: [
          { drugAId: newDrugId, drugBId: { in: activeDrugIds } },
          { drugBId: newDrugId, drugAId: { in: activeDrugIds } },
        ],
      },
      include: {
        drugA: { select: { id: true, genericName: true } },
        drugB: { select: { id: true, genericName: true } },
      },
      orderBy: { severity: 'desc' },
    });

    if (interactions.length === 0) return { severity: null, interactions: [] };

    const severityOrder = ['CONTRAINDICATED', 'MAJOR', 'MODERATE', 'MINOR'];
    const highestSeverity = interactions.reduce((worst, current) => {
      const wIdx = severityOrder.indexOf(worst.severity);
      const cIdx = severityOrder.indexOf(current.severity);
      return cIdx < wIdx ? current : worst;
    }, interactions[0]);

    return {
      severity: highestSeverity.severity,
      interactions: interactions.map((i) => ({
        id: i.id,
        drugA: i.drugA,
        drugB: i.drugB,
        severity: i.severity,
        description: i.description,
        clinicalConsequence: i.clinicalConsequence,
        management: i.management,
      })),
    };
  }

  // ─── Contraindication Check ────────────────────────────────────────────────

  async checkContraindications(patientId: string, drugId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { allergyFlags: true, chronicConditions: true },
    });
    if (!patient) return [];

    const contraindications = await prisma.drugContraindication.findMany({
      where: { drugId },
    });

    if (contraindications.length === 0) return [];

    const flags = (patient.allergyFlags ?? {}) as Record<string, boolean>;
    const conditions = patient.chronicConditions ?? [];
    const warnings: string[] = [];

    for (const ci of contraindications) {
      if (flags.pregnant && (ci.pregnancyCategory === 'D' || ci.pregnancyCategory === 'X')) {
        warnings.push(
          `Pregnancy category ${ci.pregnancyCategory}: Not safe in pregnancy. ${ci.condition}`
        );
      }
      if (!ci.breastfeedingSafe && flags.breastfeeding) {
        warnings.push(`Not safe during breastfeeding. ${ci.condition}`);
      }
      if (ci.renalFlag && conditions.some((c) => c.toLowerCase().includes('renal') || c.toLowerCase().includes('kidney'))) {
        warnings.push(`Caution in renal impairment. ${ci.condition}`);
      }
      if (ci.hepaticFlag && conditions.some((c) => c.toLowerCase().includes('liver') || c.toLowerCase().includes('hepatic'))) {
        warnings.push(`Caution in hepatic impairment. ${ci.condition}`);
      }
      if (ci.elderlyFlag && flags.elderly) {
        warnings.push(`Caution in elderly patients. ${ci.condition}`);
      }
    }

    return warnings;
  }

  // ─── Create Dispensing Event ───────────────────────────────────────────────

  async createDispensingEvent(
    patientId: string,
    pharmacyId: string,
    data: CreateDispensingEventData
  ) {
    // 1. Check drug interactions
    const interactionResult = await this.checkDrugInteractions(patientId, data.drugId, pharmacyId);

    if (
      interactionResult.severity === 'MAJOR' ||
      interactionResult.severity === 'CONTRAINDICATED'
    ) {
      throw Object.assign(
        new Error(
          `Cannot dispense: ${interactionResult.severity} drug interaction detected. ${interactionResult.interactions[0]?.description ?? ''}`
        ),
        { code: 'DRUG_INTERACTION', interactions: interactionResult.interactions, severity: interactionResult.severity }
      );
    }

    // 2. Check contraindications
    const contraindicationWarnings = await this.checkContraindications(patientId, data.drugId);

    // 3. FEFO batch lookup if batchId not provided
    let batchId = data.batchId;
    if (!batchId) {
      const drug = await prisma.drugDatabase.findUnique({
        where: { id: data.drugId },
        select: { genericName: true },
      });
      if (drug) {
        const product = await prisma.product.findFirst({
          where: {
            pharmacyId,
            OR: [
              { genericName: { contains: drug.genericName, mode: 'insensitive' } },
              { name: { contains: drug.genericName, mode: 'insensitive' } },
            ],
          },
        });
        if (product) {
          const batch = await prisma.batch.findFirst({
            where: {
              productId: product.id,
              pharmacyId,
              quantityRemaining: { gt: 0 },
            },
            orderBy: { expiryDate: 'asc' },
          });
          if (batch) {
            batchId = batch.id;
            // Deduct from batch
            await prisma.batch.update({
              where: { id: batch.id },
              data: { quantityRemaining: batch.quantityRemaining - data.quantity },
            });
          }
        }
      }
    }

    let unitPrice = 0;
    if (batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          product: { select: { sellingPrice: true, name: true, genericName: true } },
        },
      });
      unitPrice = batch?.product?.sellingPrice ?? 0;
    }

    // 4. Create dispensing event
    const event = await prisma.dispensingEvent.create({
      data: {
        patientId,
        drugId: data.drugId,
        batchId: batchId ?? null,
        quantity: data.quantity,
        dose: data.dose ?? null,
        icdCode: data.icdCode ?? null,
        counsellingNotes: data.counsellingNotes ?? null,
        dispensedByUserId: data.dispensedByUserId,
        pharmacyId,
        vfdStatus: 'PENDING',
        paymentMethod: data.paymentMethod ?? PaymentMethod.CASH,
        paymentRef: data.paymentRef ?? null,
      },
      include: {
        drug: { select: { id: true, genericName: true } },
        batch: { select: { id: true, batchNumber: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // 5. Generate VFD receipt
    try {
      const vfdResult = await vfdService.generateReceipt({
        dispensingEventId: event.id,
        amount: data.quantity * unitPrice,
        items: [
          {
            name: event.drug.genericName,
            qty: data.quantity,
            price: unitPrice,
          },
        ],
        pharmacyTin: process.env.PHARMACY_TIN ?? '',
      });

      await prisma.dispensingEvent.update({
        where: { id: event.id },
        data: {
          vfdReceiptNumber: vfdResult.receiptNumber ?? null,
          vfdStatus: vfdResult.status,
        },
      });
    } catch (vfdErr) {
      logger.warn(`VFD receipt generation failed for event ${event.id}: ${String(vfdErr)}`);
    }

    // 6. Log minor/moderate interaction warnings
    const minorWarnings = interactionResult.interactions.filter(
      (i) => i.severity === 'MINOR' || i.severity === 'MODERATE'
    );

    if (minorWarnings.length > 0) {
      await Promise.all(
        minorWarnings.map((iw) =>
          prisma.interactionAlertLog.create({
            data: {
              dispensingEventId: event.id,
              drugAId: iw.drugA.id,
              drugBId: iw.drugB.id,
              severity: iw.severity,
            },
          })
        )
      );
    }

    return {
      ...event,
      interactionWarnings: minorWarnings,
      contraindicationWarnings,
    };
  }

  async dispenseWalkIn(pharmacyId: string, data: WalkInDispensingData) {
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      throw new Error('quantity must be a positive integer');
    }

    const batch = await prisma.batch.findFirst({
      where: {
        productId: data.productId,
        pharmacyId,
        quantityRemaining: { gte: data.quantity },
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            genericName: true,
            brandName: true,
            drugClass: true,
            sellingPrice: true,
            tmdaRegistrationNumber: true,
          },
        },
      },
    });

    if (!batch) {
      const stock = await prisma.batch.aggregate({
        where: { productId: data.productId, pharmacyId },
        _sum: { quantityRemaining: true },
      });
      throw new Error(`Insufficient stock. Available: ${stock._sum.quantityRemaining ?? 0}`);
    }

    const unitPrice = batch.product.sellingPrice ?? 0;
    const productName = batch.product.genericName || batch.product.name;
    const referenceNumber =
      data.referenceNumber || `WALKIN-${Date.now().toString(36).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      let drug = batch.product.tmdaRegistrationNumber
        ? await tx.drugDatabase.findFirst({
            where: { tmdaRegistrationNumber: batch.product.tmdaRegistrationNumber },
          })
        : null;

      if (!drug) {
        drug = await tx.drugDatabase.findFirst({
          where: { genericName: { equals: productName, mode: 'insensitive' } },
        });
      }

      if (!drug) {
        drug = await tx.drugDatabase.create({
          data: {
            genericName: productName,
            brandNames: batch.product.brandName ? [batch.product.brandName] : [],
            drugClass: batch.product.drugClass ?? null,
            tmdaRegistrationNumber: batch.product.tmdaRegistrationNumber ?? null,
            standardDosing: {} as Prisma.InputJsonValue,
          },
        });
      }

      const walkInPatient = await tx.patient.create({
        data: {
          chronicConditions: [],
          allergyFlags: {} as Prisma.InputJsonValue,
          activeMedications: [],
          optInStatus: false,
          optInMethod: 'WALK_IN',
          pharmacyId,
        },
      });

      const lastMovement = await tx.stockMovement.findFirst({
        where: { productId: data.productId, pharmacyId },
        orderBy: { createdAt: 'desc' },
      });
      const previousBalance = lastMovement ? lastMovement.newBalance : batch.quantityRemaining;
      const newBalance = previousBalance - data.quantity;

      await tx.batch.update({
        where: { id: batch.id },
        data: { quantityRemaining: batch.quantityRemaining - data.quantity },
      });

      const notes = [
        'Walk-in dispensing',
        `Payment: ${data.paymentMethod}`,
        data.paymentRef ? `Payment ref: ${data.paymentRef}` : null,
        data.icdCode ? `ICD: ${data.icdCode}` : null,
        data.dose ? `Dose: ${data.dose}` : null,
        data.counsellingNotes || null,
      ]
        .filter(Boolean)
        .join(' | ');

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          batchId: batch.id,
          type: 'DISPENSED',
          quantity: data.quantity,
          previousBalance,
          newBalance,
          referenceNumber,
          notes,
          userId: data.dispensedByUserId,
          pharmacyId,
        },
      });

      const event = await tx.dispensingEvent.create({
        data: {
          patientId: walkInPatient.id,
          drugId: drug.id,
          batchId: batch.id,
          quantity: data.quantity,
          dose: data.dose ?? null,
          icdCode: data.icdCode ?? null,
          counsellingNotes: data.counsellingNotes ?? null,
          dispensedByUserId: data.dispensedByUserId,
          pharmacyId,
          paymentMethod: data.paymentMethod,
          paymentRef: data.paymentRef ?? null,
          vfdStatus: 'PENDING',
        },
      });

      return { event, movement };
    });

    let vfdReceiptNumber: string | null = null;
    let vfdStatus = result.event.vfdStatus;
    try {
      const vfdResult = await vfdService.generateReceipt({
        dispensingEventId: result.event.id,
        amount: data.quantity * unitPrice,
        items: [{ name: productName, qty: data.quantity, price: unitPrice }],
        pharmacyTin: process.env.PHARMACY_TIN ?? '',
      });
      vfdReceiptNumber = vfdResult.receiptNumber ?? null;
      vfdStatus = vfdResult.status;
      await prisma.dispensingEvent.update({
        where: { id: result.event.id },
        data: { vfdReceiptNumber, vfdStatus },
      });
    } catch (vfdErr) {
      logger.warn(`VFD failed for walk-in event ${result.event.id}: ${String(vfdErr)}`);
    }

    return {
      eventId: result.event.id,
      movementId: result.movement.id,
      referenceNumber,
      productName,
      quantity: data.quantity,
      unitPrice,
      totalAmount: data.quantity * unitPrice,
      paymentMethod: data.paymentMethod,
      paymentRef: data.paymentRef ?? null,
      vfdReceiptNumber,
      vfdStatus,
      dispensedAt: result.event.dispensedAt,
    };
  }

  async dispenseWalkInCart(
    pharmacyId: string,
    data: {
      items: Array<Omit<WalkInDispensingData, 'dispensedByUserId' | 'paymentMethod' | 'paymentRef' | 'referenceNumber'>>;
      dispensedByUserId: string;
      paymentMethod: PaymentMethod;
      paymentRef?: string;
    }
  ) {
    if (!data.items.length) {
      throw new Error('At least one cart item is required');
    }

    const referenceNumber = `WALKIN-${Date.now().toString(36).toUpperCase()}`;
    const lines = [];

    for (const item of data.items) {
      lines.push(
        await this.dispenseWalkIn(pharmacyId, {
          ...item,
          dispensedByUserId: data.dispensedByUserId,
          paymentMethod: data.paymentMethod,
          paymentRef: data.paymentRef,
          referenceNumber,
        })
      );
    }

    return {
      referenceNumber,
      paymentMethod: data.paymentMethod,
      paymentRef: data.paymentRef ?? null,
      itemCount: lines.length,
      totalAmount: lines.reduce((sum, line) => sum + line.totalAmount, 0),
      vfdReceipts: lines.map((line) => ({
        eventId: line.eventId,
        vfdReceiptNumber: line.vfdReceiptNumber,
        vfdStatus: line.vfdStatus,
      })),
      lines,
      dispensedAt: lines[0]?.dispensedAt ?? new Date(),
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Void Dispensing Event ─────────────────────────────────────────────────

  async voidDispensingEvent(
    eventId: string,
    patientId: string,
    pharmacyId: string,
    data: { voidReason: string; voidedByUserId: string }
  ) {
    const event = await prisma.dispensingEvent.findFirst({
      where: { id: eventId, patientId, pharmacyId },
    });
    if (!event) throw new Error('Dispensing event not found');
    if (event.isVoided) throw new Error('Event already voided');

    return prisma.dispensingEvent.update({
      where: { id: eventId },
      data: {
        isVoided: true,
        voidReason: data.voidReason,
        voidedAt: new Date(),
        voidedByUserId: data.voidedByUserId,
      },
    });
  }

  // ─── Log Interaction Alert ─────────────────────────────────────────────────

  async logInteractionAlert(data: InteractionAlertData) {
    return prisma.interactionAlertLog.create({
      data: {
        dispensingEventId: data.dispensingEventId,
        drugAId: data.drugAId,
        drugBId: data.drugBId,
        severity: data.severity,
        overridePin: data.overridePin ?? null,
        overrideReason: data.overrideReason ?? null,
        overrideUserId: data.overrideUserId ?? null,
      },
    });
  }

  // ─── ICD-10 Search ─────────────────────────────────────────────────────────

  async searchIcd10(query: string, limit = 20) {
    return prisma.iCD10Code.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { code: 'asc' },
    });
  }

  async getCommonIcd10(pharmacyId: string, limit = 20) {
    // Get most used ICD-10 codes from dispensing events in this pharmacy
    const results = await prisma.dispensingEvent.groupBy({
      by: ['icdCode'],
      where: {
        pharmacyId,
        icdCode: { not: null },
        isVoided: false,
      },
      _count: { icdCode: true },
      orderBy: { _count: { icdCode: 'desc' } },
      take: limit,
    });

    const codes = results.map((r) => r.icdCode).filter(Boolean) as string[];

    const icdRecords = await prisma.iCD10Code.findMany({
      where: { code: { in: codes } },
    });

    const icdMap = new Map(icdRecords.map((r) => [r.code, r]));

    return results.map((r) => ({
      code: r.icdCode,
      count: r._count.icdCode,
      description: icdMap.get(r.icdCode ?? '')?.description ?? null,
    }));
  }
}

export default PatientService;
