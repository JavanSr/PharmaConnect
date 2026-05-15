// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'PHARMACIST_IN_CHARGE'
  | 'DISPENSER'
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
export type SubscriptionTier = 'FREE' | 'ADDO' | 'ESSENTIAL' | 'ADDO_PLUS' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE' | 'ENTERPRISE';
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
  sellerPharmacyName: string;
  productId: string;
  productName: string;
  genericName: string | null;
  barcode: string | null;
  price: number;
  tierPrices?: Partial<Record<SubscriptionTier, number>>;
  effectivePrice?: number;
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
  scheduledDeliveryAt?: string | null;
  deliveryWindowLabel?: string | null;
  deliveryNote?: string | null;
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
  efdmsStatus?: string;
  efdmsReference?: string | null;
  efdmsPayload?: Record<string, unknown> | null;
  efdmsSyncedAt?: string | null;
  issuedAt: string;
}

export interface WholesaleCreditLimit {
  id: string;
  sellerPharmacyId: string;
  clientPharmacyId: string;
  clientName?: string;
  creditLimit: number;
  outstandingBalance: number;
  paymentTermsDays: number;
  isActive: boolean;
  blockNewOrders: boolean;
  blockReason: string | null;
}

export interface WholesaleReceivableInvoice {
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  buyerPharmacyId: string;
  buyerName: string;
  openAmount: number;
  daysOutstanding: number;
  issuedAt: string;
}

export interface WholesaleReceivablesAging {
  totalOpenAmount: number;
  buckets: {
    current: number;
    days31To60: number;
    days61To90: number;
    over90: number;
  };
  invoices: WholesaleReceivableInvoice[];
}

export interface WholesaleDemandInsightProduct {
  productId: string;
  productName: string;
  units: number;
  revenueTzs: number;
  activeBuyers: number;
}

export interface WholesaleDemandInsights {
  windows: {
    current30d: {
      units: number;
      revenueTzs: number;
    };
    previous30d: {
      units: number;
      revenueTzs: number;
    };
  };
  topProducts: WholesaleDemandInsightProduct[];
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
  awarClass?: 'ACCESS' | 'WATCH' | 'RESERVE' | null;
  drugMasterId?: string | null;
  masterCatalogMatched?: boolean;
  pendingReview?: boolean;
  reviewQueueStatus?: string | null;
  verificationStatus?: 'MASTER_CATALOG_MATCHED' | 'UNVERIFIED';
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

export type ReviewQueueStatus =
  | 'DRAFT'
  | 'IMPORTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETIRED';

export type ReviewerType = 'PLATFORM_PHARMACIST' | 'PIC_OVERRIDE' | 'TMDA_REFERENCE';

export interface ReviewSourceDocumentSummary {
  id: string;
  title: string;
  sourceName: string;
  url: string | null;
  sourceType: string;
}

export interface ReviewActorSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface DataReviewAuditLog {
  id: string;
  action: string;
  previousStatus: ReviewQueueStatus | null;
  nextStatus: ReviewQueueStatus | null;
  reviewerType: ReviewerType | null;
  actorUserId: string | null;
  actorRole: string | null;
  pharmacyId: string | null;
  note: string | null;
  payloadSnapshot: unknown;
  createdAt: string;
  actorUser?: ReviewActorSummary | null;
}

export interface DataReviewQueueEntry {
  id: string;
  entityType: string;
  entityId: string;
  sourceDocumentId: string | null;
  reviewerType: ReviewerType | null;
  reviewerUserId: string | null;
  pharmacyId: string | null;
  status: ReviewQueueStatus;
  currentPayload: unknown;
  proposedPayload: unknown;
  notes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceDocument?: ReviewSourceDocumentSummary | null;
  reviewerUser?: ReviewActorSummary | null;
  auditLogs?: DataReviewAuditLog[];
}

export type SourceSyncStatus = 'STARTED' | 'COMPLETED' | 'FAILED';
export type SourceSyncChangeType =
  | 'NEW_SOURCE'
  | 'SOURCE_METADATA_UPDATED'
  | 'SOURCE_UNCHANGED'
  | 'SOURCE_CHECK_FAILED'
  | 'SOURCE_NOT_MONITORED';

export interface SourceSyncSnapshot {
  category: 'MASTER_CATALOG' | 'SAFETY_RULES' | 'GENERIC_SOURCE';
  reviewQueueCount: number;
  importedProductCount?: number;
  sourceRecordCount?: number;
  approvedRuleCounts?: {
    interactions: number;
    contraindications: number;
    warnings: number;
    pregnancyFlags: number;
    lactationFlags: number;
    renalFlags: number;
    hepaticFlags: number;
  };
  sourceFingerprint?: string | null;
  importedFingerprint?: string | null;
  requiresReview: boolean;
  notes: string[];
}

export interface SourceSyncNextValue {
  url?: string | null;
  checksum?: string | null;
  documentVersion?: string | null;
  status?: number;
  headers?: Record<string, string | null>;
  snapshot?: SourceSyncSnapshot;
}

export interface SourceSyncChange {
  id: string;
  syncRunId: string;
  sourceDocumentId: string | null;
  changeType: SourceSyncChangeType;
  summary: string;
  previousValue: unknown;
  nextValue: SourceSyncNextValue | unknown;
  createdAt: string;
  sourceDocument?: Pick<ReviewSourceDocumentSummary, 'id' | 'sourceName' | 'title' | 'url'> | null;
}

export interface SourceSyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: SourceSyncStatus;
  triggeredBy: string | null;
  notes: string | null;
  sourcesChecked: number;
  changesDetected: number;
  createdAt: string;
  updatedAt: string;
  sourceDocumentId?: string | null;
  changes: SourceSyncChange[];
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

export interface PharmacyMembership {
  id: string;
  pharmacyId: string;
  role: UserRole;
  active: boolean;
  validFrom: string | null;
  validUntil: string | null;
  selected: boolean;
  pharmacy: Pharmacy;
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

// ─── Dispensing ───────────────────────────────────────────────────────────────

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
  dispensedById: string;
  dispensedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  referenceNumber: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  items: DispensingItem[];
  createdAt: string;
}

export interface DispensingEventSummary {
  id: string;
  referenceNumber: string;
  paymentMethod: PaymentMethod | string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  voidReason: string | null;
  voidedAt: string | null;
  itemCount: number;
}

export interface ControlledRegisterEntry {
  eventId: string;
  referenceNumber: string;
  productId: string;
  productName: string;
  drugClass: 'CONTROLLED' | 'NARCOTIC';
  quantity: number;
  batchNumber: string | null;
  paymentMethod: string;
  dispensedByName: string;
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
