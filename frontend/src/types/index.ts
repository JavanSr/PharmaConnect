// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'PHARMACIST_IN_CHARGE'
  | 'DISPENSER'
  | 'DATA_ENTRY_CLERK'
  | 'WHOLESALE_SELLER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  pharmacyId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Pharmacy ─────────────────────────────────────────────────────────────────

export type PharmacyType = 'RETAIL' | 'ADDO' | 'WHOLESALE';

export interface Pharmacy {
  id: string;
  name: string;
  licenceNumber: string;
  address: string;
  region: string;
  pharmacyType: PharmacyType;
  isActive: boolean;
  createdAt: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type DrugClass = 'OTC' | 'PRESCRIPTION' | 'CONTROLLED' | 'NARCOTIC';
export type DosageForm =
  | 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'CREAM' | 'OINTMENT'
  | 'DROPS' | 'INHALER' | 'SUPPOSITORY' | 'POWDER' | 'SOLUTION' | 'OTHER';

export interface Product {
  id: string;
  pharmacyId: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  barcode: string | null;
  dosageForm: DosageForm;
  strength: string | null;
  unitOfMeasure: string;
  drugClass: DrugClass;
  description: string | null;
  reorderLevel: number;
  sellingPrice: number | null;
  tmda: string | null;
  isActive: boolean;
  currentStock?: number;
  createdAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  product?: Product;
  pharmacyId: string;
  batchNumber: string;
  expiryDate: string;
  quantityRemaining: number;
  purchasePrice: number;
  supplierId: string | null;
  supplier?: Supplier;
  receivedAt: string;
}

export interface Supplier {
  id: string;
  pharmacyId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

export type MovementType =
  | 'RECEIVED' | 'DISPENSED' | 'ADJUSTED' | 'DAMAGED'
  | 'EXPIRED_REMOVED' | 'RETURNED' | 'TRANSFERRED';

export interface StockMovement {
  id: string;
  pharmacyId: string;
  productId: string;
  product?: Product;
  batchId: string | null;
  batch?: Batch;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  type: MovementType;
  quantity: number;
  notes: string | null;
  createdAt: string;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type ComplianceCategory =
  | 'LICENCE' | 'INSURANCE' | 'EQUIPMENT' | 'STAFF_CREDENTIAL'
  | 'SAFETY' | 'RECORD_KEEPING' | 'OTHER';

export type ComplianceStatus = 'COMPLIANT' | 'DUE_SOON' | 'OVERDUE' | 'NOT_APPLICABLE';

export interface ComplianceItem {
  id: string;
  pharmacyId: string;
  title: string;
  category: ComplianceCategory;
  description: string | null;
  dueDate: string | null;
  renewalDate: string | null;
  documentRef: string | null;
  isNotApplicable: boolean;
  status: ComplianceStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Patient & Dispensing ─────────────────────────────────────────────────────

export interface Patient {
  id: string;
  pharmacyId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  phone: string | null;
  nhifNumber: string | null;
  allergies: string[];
  chronicConditions: string[];
  createdAt: string;
}

export interface ICD10Code {
  code: string;
  description: string;
}

export type PaymentMethod = 'CASH' | 'MPESA' | 'TIGOPESA' | 'AIRTEL_MONEY' | 'HALOPESA' | 'INSURANCE';

export interface DispensingRecord {
  id: string;
  pharmacyId: string;
  patientId: string | null;
  patient?: Patient;
  dispensedById: string;
  dispensedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  referenceNumber: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  items: DispensingItem[];
  createdAt: string;
}

export interface DispensingItem {
  id: string;
  dispensingId: string;
  productId: string;
  product?: Product;
  batchId: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  dose: string | null;
  icdCode: string | null;
  icdDescription: string | null;
  counsellingNotes: string | null;
}

// ─── NHIF ─────────────────────────────────────────────────────────────────────

export type NhifClaimStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface NhifClaim {
  id: string;
  pharmacyId: string;
  claimNumber: string;
  patientNhifNumber: string;
  patientName: string;
  serviceDate: string;
  totalAmount: number;
  status: NhifClaimStatus;
  submittedAt: string | null;
  processedAt: string | null;
  rejectionReason: string | null;
  items: NhifClaimItem[];
  createdAt: string;
}

export interface NhifClaimItem {
  id: string;
  claimId: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  icdCode: string | null;
}

// ─── CPD ──────────────────────────────────────────────────────────────────────

export type CpdActivityType =
  | 'READING' | 'WORKSHOP' | 'CONFERENCE' | 'ONLINE_COURSE'
  | 'MENTORING' | 'AUDIT' | 'OTHER';

export interface CpdActivity {
  id: string;
  userId: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  activityType: CpdActivityType;
  title: string;
  provider: string | null;
  activityDate: string;
  pointsClaimed: number;
  pointsApproved: number | null;
  certificate: string | null;
  sourceArticleId: string | null;
  notes: string | null;
  createdAt: string;
}

// ─── Knowledge ────────────────────────────────────────────────────────────────

export type ArticleCategory =
  | 'DRUG_SAFETY' | 'REGULATORY' | 'CLINICAL' | 'BUSINESS'
  | 'TECHNOLOGY' | 'CPD' | 'GENERAL';

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: Record<string, unknown>;
  category: ArticleCategory;
  tags: string[];
  author: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  authorId: string | null;
  readingTimeMinutes: number;
  viewCount: number;
  isPublished: boolean;
  isSponsored: boolean;
  sponsorName: string | null;
  publishedAt: string | null;
  createdAt: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
