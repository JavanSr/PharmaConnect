/**
 * Daily at 06:00 EAT — Check for batches expiring in [1,7,30,60,90] days.
 * Send SMS to Pharmacist In-Charge and Owner.
 * Log to AlertLog (prevent duplicate same-day alerts).
 */
declare function runExpiryAlerts(days: number): Promise<void>;
/**
 * Daily at 06:00 EAT — Check for compliance items expiring in [90,60,30,14,7,3,1] days
 * or already expired. Send SMS + Email + In-app. Log to ComplianceAlert.
 */
declare function runComplianceAlerts(): Promise<void>;
/**
 * Nightly — Recompute GREEN/AMBER/RED/EXPIRED for all compliance items.
 * GREEN: > 90 days
 * AMBER: 31–90 days
 * RED: 1–30 days
 * EXPIRED: <= 0 days
 */
declare function updateComplianceStatuses(): Promise<void>;
/**
 * Mondays at 07:00 EAT — Send weekly digest to all active subscribers.
 */
declare function runWeeklyDigest(): Promise<void>;
/**
 * Every 5 minutes — Retry QUEUED VFD receipts.
 */
declare function processVfdQueue(): Promise<void>;
export declare function initJobs(): void;
export { runExpiryAlerts, runComplianceAlerts, updateComplianceStatuses, runWeeklyDigest, processVfdQueue, };
export default initJobs;
//# sourceMappingURL=index.d.ts.map