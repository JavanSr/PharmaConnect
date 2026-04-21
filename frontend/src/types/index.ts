// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'PHARMACIST_IN_CHARGE'
  | 'DISPENSER'
  | 'DATA_ENTRY_CLERK'
  | 'CASHIER'
  | 'WHOLESALE_MANAGER'
  | 'WHOLESALE_COUNTER_STAFF'
  | 'DELIVERY_STAFF'
  | 'WHOLESALE_SELLER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  pcRegistrationNumber?: string | null;
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
export type SubscriptionTier = 'FREE' | 'ADDO' | 'ADDO_PLUS' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type PharmacyAccountStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export interface Pharmacy {
  id: string;
  name: string;
  licenceNumber: string;
  address: string;
  region: string;
  pharmacyType: PharmacyType;
  subscriptionTier?: SubscriptionTier;
  billingCycle?: BillingCycle;
  status?: PharmacyAccountStatus;
  trialActive?: boolean;
  trialStartsAt?: string;
  trialEndsAt?: string;
  isHybrid?: boolean;
  hybridAddonActive?: boolean;
  vfdEnabled?: boolean;
  userLimit?: number;
  isActive: boolean;
  createdAt: string;
}

export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED';

export interface WholesaleCatalogueItem {
  catalogueId: string;
  title: string;
  description: string | null;
  sellerPharmacyId: string;
  productId: string;
  productName: string;
  genericName: string | null;
  barcode: string | null;
  price: number;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
}

export interface WholesaleOrderLine {
  productId: string;
  productName: string;
  genericName: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  pickedQuantity?: number;
  verifiedQuantity?: number;
}

export interface WholesaleOrder {
  id: string;
  orderNumber: string;
  buyerPharmacyId: string;
  sellerPharmacyId: string;
  assignedPicker?: string | null;
  assignedDriver?: string | null;
  status: OrderStatus;
  items: WholesaleOrderLine[];
  subtotalAmount: number;
  totalAmount: number;
  notes?: string | null;
  submittedAt?: string | null;
  confirmedAt?: string | null;
  packedAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  disputedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VatInvoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  pdfPath: string | null;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  issuedAt: string;
}

export interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: string;
  notes: string | null;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
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
  sku?: string | null;
  barcode: string | null;
  dosageForm: DosageForm;
  strength: string | null;
  unitOfMeasure: string;
  drugClass: DrugClass;
  description: string | null;
  reorderLevel: number;
  sellingPrice: number | null;
  tmda: string | null;
  tmdaRegistrationNumber?: string | null;
  coldChainRequired?: boolean;
  isColdChain?: boolean;
  storageCondition?: string;
  retailStock?: boolean;
  wholesaleStock?: boolean;
  wholesaleSellingPrice?: number | null;
  manufacturer?: string | null;
  therapeuticCategory?: string | null;
  isActive: boolean;
  currentStock?: number;
  nextExpiringBatch?: Batch | null;
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

export type SyncConflictStatus = 'OPEN' | 'RESOLVED';

export interface SyncConflict {
  id: string;
  pharmacyId: string;
  entityType: string;
  entityId: string;
  conflictType: string;
  localPayload: Record<string, unknown>;
  serverPayload: Record<string, unknown>;
  status: SyncConflictStatus;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export type StockAdjustmentSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL';

export interface StockAdjustmentSuggestion {
  id: string;
  pharmacyId: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'genericName'>;
  batchId: string | null;
  batch?: Pick<Batch, 'id' | 'batchNumber' | 'expiryDate'> | null;
  quantityDelta: number;
  approvedQuantityDelta: number | null;
  reason: string;
  note: string | null;
  photoPath: string | null;
  status: StockAdjustmentSuggestionStatus;
  createdBy: string;
  creator?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  reviewedBy: string | null;
  reviewer?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type ComplianceCategory =
  | 'LICENCE' | 'INSURANCE' | 'EQUIPMENT' | 'STAFF_CREDENTIAL'
  | 'SAFETY' | 'RECORD_KEEPING' | 'OTHER';

export type ComplianceStatus =
  | 'COMPLIANT'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'NOT_APPLICABLE'
  | 'GREEN'
  | 'AMBER'
  | 'RED'
  | 'EXPIRED';

export interface ComplianceItem {
  id: string;
  pharmacyId: string;
  name?: string;
  title: string;
  type?: string;
  category: ComplianceCategory;
  description: string | null;
  issuingBody?: string | null;
  expiryDate?: string | null;
  dueDate: string | null;
  renewalDate: string | null;
  documentRef: string | null;
  documents?: Array<Record<string, unknown>>;
  _count?: {
    documents?: number;
  };
  isNotApplicable: boolean;
  status: ComplianceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDocument {
  id: string;
  filename: string;
  fileUrl: string;
  uploadedAt: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
}

export interface StaffCredential {
  id: string;
  pharmacyId: string;
  userId?: string | null;
  credentialName: string;
  credentialNumber?: string | null;
  issuingBody?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  status: string;
  notes?: string | null;
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
  allergyFlags?: Record<string, boolean>;
  chronicConditions: string[];
  activeMedications?: string[];
  createdAt: string;
}

export interface ICD10Code {
  id?: string;
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

export type NhifClaimStatus = 'DRAFT' | 'SCRUBBED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'RESUBMITTED';

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
  auto_logged?: boolean | null;
  renewal_year?: number | null;
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
  htmlContent?: string | null;
}

export interface Bulletin {
  id: string;
  title: string;
  body: Record<string, unknown>;
  isUrgent: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface Publication {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  coverImageUrl?: string | null;
  category?: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface CourseEnrollment {
  id: string;
  status: string;
  progress_percentage?: number;
  progressPercentage?: number;
  score: number | null;
  attempts: number;
  last_attempt_at?: string | null;
  lastAttemptAt?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  certificate_id?: string | null;
  certificateId?: string | null;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content?: Record<string, unknown>;
  assessment?: { questions?: Array<{ id: string; prompt: string; options: string[]; correctIndex?: number; explanation?: string }> };
  passingScore: number;
  cooldownHours: number;
  pointsAwarded: number;
  isPcAccredited: boolean;
  publishedAt: string | null;
  enrolment?: CourseEnrollment | null;
}

export interface CertificateVerification {
  certificateId: string;
  courseTitle: string;
  holderName: string;
  completedAt: string | null;
  score: number | null;
  pointsAwarded: number;
  isPcAccredited: boolean;
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
