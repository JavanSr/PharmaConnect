// Types for PharmaConnect frontend
export type UserRole = 'OWNER' | 'PHARMACIST_IN_CHARGE' | 'DISPENSER' | 'DATA_ENTRY_CLERK' | 'WHOLESALE_ADMIN' | 'WHOLESALE_SELLER' | 'SUPER_ADMIN';
export type PharmacyType = 'RETAIL' | 'ADDO' | 'WHOLESALE';
export type SubscriptionTier = 'FREE' | 'ADDO_PLUS' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE';
export type ArticleStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type StorageCondition = 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
export type MovementType = 'RECEIVED' | 'DISPENSED' | 'ADJUSTED' | 'DAMAGED' | 'RETURNED' | 'EXPIRED_REMOVED' | 'DONATED' | 'TRANSFERRED';
export type ComplianceType = 'TMDA_PREMISE' | 'PC_IN_CHARGE' | 'PC_TECHNOLOGIST' | 'DLDM_CERT' | 'COLD_CHAIN' | 'NARCOTICS' | 'BUSINESS_LICENCE' | 'CUSTOM';
export type ComplianceStatus = 'GREEN' | 'AMBER' | 'RED' | 'EXPIRED';
export type InteractionSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
export type CpdActivityType = 'READING' | 'WEBINAR' | 'CONFERENCE' | 'WORKSHOP' | 'SELF_STUDY';
export type NhifClaimStatus = 'DRAFT' | 'SCRUBBED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';

export interface User { id: string; email: string; firstName: string; lastName: string; role: UserRole; pharmacyId: string | null; pcRegistrationNumber?: string; isActive: boolean; createdAt: string; updatedAt: string; }
export interface Pharmacy { id: string; name: string; licenceNumber: string; address: string; region: string; pharmacyType: PharmacyType; subscriptionTier: SubscriptionTier; ownerId?: string; createdAt: string; }
export interface Product { id: string; name: string; genericName?: string; brandName?: string; sku?: string; barcode?: string; dosageForm?: string; strength?: string; unitOfMeasure: string; packSize: number; storageCondition: StorageCondition; isColdChain: boolean; tmdaRegistrationNumber?: string; sellingPrice?: number; reorderLevel: number; minStock: number; isActive: boolean; pharmacyId: string; currentStock?: number; createdAt: string; updatedAt: string; }
export interface Batch { id: string; productId: string; batchNumber: string; expiryDate: string; quantityRemaining: number; purchasePrice: number; supplierId?: string; receivedAt: string; pharmacyId: string; product?: Product; supplier?: Supplier; }
export interface StockMovement { id: string; productId: string; batchId?: string; type: MovementType; quantity: number; previousBalance: number; newBalance: number; referenceNumber?: string; reason?: string; notes?: string; userId: string; pharmacyId: string; createdAt: string; }
export interface Supplier { id: string; name: string; contactPerson?: string; phone?: string; email?: string; address?: string; pharmacyId: string; }
export interface ComplianceItem { id: string; type: ComplianceType; name: string; issuingBody: string; licenceNumber?: string; issueDate?: string; expiryDate: string; status: ComplianceStatus; notes?: string; pharmacyId: string; assignedStaffId?: string; daysUntilExpiry?: number; documents?: ComplianceDocument[]; createdAt: string; updatedAt: string; }
export interface ComplianceDocument { id: string; complianceItemId: string; filename: string; fileUrl: string; fileSize: number; uploadedAt: string; }
export interface StaffCredential { id: string; userId: string; credentialType: string; registrationNumber: string; expiryDate: string; pharmacyId: string; user?: Pick<User,'id'|'firstName'|'lastName'|'role'>; }
export interface Patient { id: string; chronicConditions: string[]; allergyFlags: Record<string, boolean>; activeMedications: string[]; optInStatus: boolean; optInTimestamp?: string; optInMethod?: string; createdAt: string; pharmacyId: string; }
export interface DispensingEvent { id: string; patientId: string; drugId: string; batchId?: string; quantity: number; dose?: string; icdCode?: string; counsellingNotes?: string; dispensedByUserId: string; pharmacyId: string; dispensedAt: string; isVoided: boolean; voidReason?: string; vfdReceiptNumber?: string; vfdStatus: string; drug?: DrugDatabase; batch?: Batch; }
export interface DrugDatabase { id: string; genericName: string; brandNames: string[]; drugClass?: string; atcCode?: string; tmdaRegistrationNumber?: string; standardDosing: Record<string,any>; isOTC: boolean; isControlled: boolean; }
export interface DrugInteraction { id: string; drugAId: string; drugBId: string; severity: InteractionSeverity; description: string; clinicalConsequence?: string; management?: string; drugA?: DrugDatabase; drugB?: DrugDatabase; }
export interface InteractionCheckResult { hasInteraction: boolean; severity?: InteractionSeverity; interaction?: DrugInteraction; activeCount: number; }
export interface ICD10Code { id: string; code: string; description: string; category?: string; }
export interface NhifClaim { id: string; dispensingEventId: string; patientId: string; memberName?: string; icdCode: string; drugCode?: string; quantity: number; claimedAmount: number; status: NhifClaimStatus; nhifReferenceNumber?: string; rejectionCode?: string; rejectionReason?: string; submittedAt?: string; approvedAt?: string; vfdReceiptNumber?: string; scrubResults?: ClaimScrubResult[]; createdAt: string; updatedAt: string; }
export interface ClaimScrubResult { id: string; claimId: string; rule: string; passed: boolean; errorMessage?: string; checkedAt: string; }
export interface ClaimBatch { id: string; pharmacyId: string; status: string; claimIds: string[]; submittedAt?: string; nhifBatchReference?: string; totalClaims: number; totalAmount: number; createdAt: string; }
export interface NhifAnalytics { total: number; approved: number; rejected: number; pending: number; successRate: number; topRejectionReasons: Array<{code:string;reason:string;count:number}>; }
export interface CpdActivity { id: string; userId: string; activityType: CpdActivityType; title: string; activityDate: string; pointsClaimed: number; evidenceFileUrl?: string; renewalYear: number; sourceArticleId?: string; createdAt: string; }
export interface CpdSummary { renewalYear: number; totalPoints: number; requiredPoints: number; percentComplete: number; activities: CpdActivity[]; isComplete: boolean; }
export interface Article { id: string; title: string; slug: string; body: any; category: string; tags: string[]; status: ArticleStatus; isSponsored: boolean; sponsorName?: string; featuredImage?: string; readingTimeMinutes: number; authorId: string; publishedAt?: string; viewCount: number; createdAt: string; updatedAt: string; author?: {firstName:string;lastName:string}; }
export interface AppNotification { id: string; type: 'info'|'success'|'warning'|'error'; title: string; message: string; readStatus: boolean; createdAt: string; }
export interface ToastNotification { id: string; type: 'success'|'warning'|'error'|'info'; message: string; duration?: number; }
export interface ApiResponse<T> { success: boolean; data: T; error?: string; }
export interface PaginatedResponse<T> { success: boolean; data: T[]; total: number; page: number; limit: number; totalPages: number; }
export interface SyncQueueItem { id: string; url: string; method: string; body?: any; timestamp: number; retryCount: number; }
