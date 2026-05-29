export type ActivityHealth = 'green' | 'amber' | 'red';

export type PharmacyStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'SUSPENDED' | 'CANCELLED';
export type SubscriptionTier = 'ADDO' | 'ESSENTIAL' | 'ADDO_PLUS' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE' | 'ENTERPRISE';

export interface AdminPharmacyRow {
  id: string;
  name: string;
  region: string;
  pharmacyType: string;
  tier: SubscriptionTier;
  status: PharmacyStatus;
  trialActive: boolean;
  trialEndsAt: string | null;
  isActive: boolean;
  isHybrid: boolean;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  lastLogin: string | null;
  onboardedAt: string;
  activityHealth: ActivityHealth;
}

export interface AdminPharmacyDetail extends AdminPharmacyRow {
  licenceNumber: string;
  address: string;
  billingCycle: string;
  vfdEnabled: boolean;
  userLimit: number;
  graceActivatedAt: string | null;
  internalNotes: string | null;
  owner: { id: string; name: string; email: string; phone: string | null; lastLogin: string | null; isActive: boolean } | null;
  staff: Array<{ id: string; name: string; email: string; role: string; membershipRole: string; lastLogin: string | null }>;
}

export interface AdminPayment {
  id: string;
  amountTzs: number;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  loggedBy: string;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  adminEmail: string;
  action: string;
  targetPharmacyId: string | null;
  pharmacyName: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface PharmacyUsage {
  totalTransactions: number;
  transactions30d: number;
  transactions7d: number;
  dailyActiveUsers30d: number;
  staff: Array<{ id: string; name: string; role: string; membershipRole: string; lastLogin: string | null; activeInLast30d: boolean }>;
  featuresUsed: Array<{ key: string; label: string; used: boolean }>;
}

export interface DashboardMetrics {
  activePharmacies: number;
  mrr: number;
  transactionsThisMonth: number;
  newPharmaciesThisMonth: number;
  churnedThisMonth: number;
  gracePeriodCount: number;
  gracePeriodPharmacies: Array<{ id: string; name: string; region: string; subscriptionTier: string; graceActivatedAt: string | null }>;
  statusBreakdown: Record<string, number>;
  mrrTrend: Array<{ month: string; totalTzs: number }>;
}

export interface FeatureFlagData {
  featureKeys: readonly string[];
  perPharmacy: Array<{ pharmacyId: string; featureKey: string; enabled: boolean; overriddenBy: string | null; overriddenAt: string | null }>;
  global: Array<{ featureKey: string; enabled: boolean; updatedBy: string | null; updatedAt: string }>;
}

export interface AdminMessage {
  id: string;
  sentBy: string;
  recipientFilter: unknown;
  messageBody: string;
  recipientCount: number;
  sentAt: string;
}

export const STATUS_LABEL: Record<PharmacyStatus, string> = {
  TRIAL: 'Trial', ACTIVE: 'Active', GRACE: 'Grace', SUSPENDED: 'Suspended', CANCELLED: 'Cancelled',
};
export const STATUS_STYLE: Record<PharmacyStatus, string> = {
  TRIAL: 'bg-blue-50 text-blue-700',
  ACTIVE: 'bg-[#EDF7F3] text-[#1A6B5C]',
  GRACE: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-[#F1F5F9] text-[#64748B]',
  CANCELLED: 'bg-red-50 text-red-700',
};
export const HEALTH_DOT: Record<ActivityHealth, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
};

export const TIERS: SubscriptionTier[] = ['ADDO', 'ESSENTIAL', 'ADDO_PLUS', 'STANDARD', 'PREMIUM', 'WHOLESALE', 'ENTERPRISE'];
export const STATUSES: PharmacyStatus[] = ['TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED'];
export const FEATURE_KEY_LABELS: Record<string, string> = {
  controlled_register: 'Controlled Register',
  orders_module: 'Orders Module',
  analytics_module: 'Analytics',
  b2b_marketplace: 'B2B Marketplace',
  barcode_scanning: 'Barcode Scanning',
  drug_interaction_checker: 'Drug Interaction Checker',
  offline_mode: 'Offline Mode',
  cpd_module: 'CPD Module',
  owner_dashboard: 'Owner Dashboard',
};

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
