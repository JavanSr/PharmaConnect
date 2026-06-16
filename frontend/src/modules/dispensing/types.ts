import type { PaymentMethod, Product } from '@/types';

export interface DispensingCartItem {
  id: string;
  product: Product;
  quantity: number;
  dose?: string;
  unitPrice: number;
  lineTotal: number;
}

export interface SafetySessionPayload {
  productIds?: string[];
  pregnant?: boolean;
  breastfeeding?: boolean;
  ageYears?: number;
  weightKg?: number;
  allergies?: string[];
  diagnoses?: string[];
  renalImpairment?: boolean;
  hepaticImpairment?: boolean;
}

export interface SafetyAlert {
  id: string;
  drug?: string;
  drugA?: string;
  drugB?: string;
  severity: string;
  message?: string;
  effectSummary?: string;
  management?: string | null;
  requiresPicPin: boolean;
  conditionType?: string;
  conditionValue?: string;
  ruleType?: string;
  sourceTitle?: string | null;
  sourceSection?: string | null;
  sourceUrl?: string | null;
}

export interface DosageSuggestion {
  drugId: string;
  genericName: string;
  adultDose?: string | null;
  paediatric?: string | null;
  elderly?: string | null;
  route?: string | null;
  frequency?: string | null;
}

export interface DiagnosisMatch {
  id: string;
  genericName: string;
  therapeuticCategory?: string | null;
  standardAdultDose?: string | null;
}

export interface SafetyReviewResponse {
  resolvedDrugs: Array<{
    id: string;
    genericName: string;
    therapeuticCategory?: string | null;
    awarClass?: 'ACCESS' | 'WATCH' | 'RESERVE' | null;
    source: string;
    sourceType: string;
  }>;
  interactions: SafetyAlert[];
  contraindications: SafetyAlert[];
  precautions: SafetyAlert[];
  severitySummary: {
    high: number;
    moderate: number;
    informational: number;
  };
  diagnosisMatches: DiagnosisMatch[];
  ncdHints: string[];
  dosageSuggestions: DosageSuggestion[];
  requiredPatientInputs: Array<{
    key:
      | 'pregnant'
      | 'breastfeeding'
      | 'diagnoses'
      | 'allergies'
      | 'renalImpairment'
      | 'hepaticImpairment';
    label: string;
    reason: string;
  }>;
  requiresPicPin: boolean;
}

export interface DoseMethodResult {
  method: string;
  valueMg: number | null;
  displayValue?: string;
  working: string;
  supported: boolean;
}

export interface DispensingReceipt {
  id: string;
  referenceNumber: string;
  paymentMethod: PaymentMethod;
  paymentRef?: string | null;
  prescriptionPhotoPath?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  vfdStatus: string;
  createdAt: string;
  itemCount: number;
  queuedOffline?: boolean;
  lines: Array<{
    productId: string;
    productName: string;
    strength?: string | null;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    batchNumber?: string | null;
    dose?: string;
  }>;
  safetyReview?: SafetyReviewResponse | null;
}
