export interface VfdTransaction {
    dispensingEventId: string;
    amount: number;
    items: VfdItem[];
    pharmacyTin: string;
}
export interface VfdItem {
    name: string;
    qty: number;
    price: number;
}
export interface VfdReceiptResponse {
    receiptNumber: string | null;
    status: 'SUCCESS' | 'QUEUED';
}
export declare class VfdService {
    private vfdUrl;
    private certPath;
    private certPassword;
    constructor();
    /**
     * Generate a VFD receipt for a dispensing transaction.
     * Falls back to QUEUED status if the VFD endpoint is unavailable.
     */
    generateReceipt(transactionData: VfdTransaction): Promise<VfdReceiptResponse>;
    /**
     * Retry a queued VFD receipt.
     * Returns the receipt response, or throws if retry fails.
     */
    retryQueuedReceipt(dispensingEventId: string): Promise<VfdReceiptResponse>;
    /**
     * Get all queued VFD dispensing event IDs from Redis.
     */
    getQueuedEventIds(): Promise<string[]>;
    /**
     * Queue a transaction for retry.
     */
    private queueReceipt;
    /**
     * Build the TRA VFD API payload.
     */
    private buildVfdPayload;
}
export default VfdService;
//# sourceMappingURL=vfd.service.d.ts.map