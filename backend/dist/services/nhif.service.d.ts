export interface NhifCardVerification {
    AuthorizationStatus: string;
    CardNo: string;
    MemberName: string;
    MemberStatus: string;
    Scheme: string;
}
interface NhifClaimBatch {
    FolioNumber: string;
    SerialNo: string;
    ClaimYear: number;
    ClaimMonth: number;
    Folios: NhifFolio[];
}
interface NhifFolio {
    FolioID: string;
    CardNo: string;
    FirstName: string;
    LastName: string;
    Gender: string;
    DateOfBirth: string;
    TreatmentDate: string;
    ICDCode: string;
    Items: NhifFolioItem[];
}
interface NhifFolioItem {
    ItemCode: string;
    Quantity: number;
    UnitPrice: number;
}
type NhifResponse = Record<string, unknown> | unknown[];
export declare class NhifService {
    private baseUrl;
    constructor();
    /**
     * Authenticate with NHIF Breeze API and cache the token in Redis.
     */
    private authenticate;
    /**
     * Get auth headers, using cached token or re-authenticating.
     */
    private getAuthHeaders;
    /**
     * Make an authenticated request, auto-refreshing token on 401.
     */
    private authenticatedRequest;
    /**
     * Verify an NHIF card number.
     */
    verifyCard(cardNumber: string): Promise<NhifCardVerification>;
    /**
     * Get detailed card information.
     */
    getCardDetails(cardNumber: string): Promise<NhifResponse>;
    /**
     * Get NHIF tariff (price packages). Cached for 24 hours.
     */
    getTariff(): Promise<NhifResponse>;
    /**
     * Submit a claim batch to NHIF.
     */
    submitClaims(batch: NhifClaimBatch): Promise<NhifResponse>;
    /**
     * Get the status of a submitted claim batch.
     */
    getClaimStatus(batchRef: string): Promise<NhifResponse>;
    /**
     * Log an API call to the NhifApiLog table.
     */
    private logApiCall;
}
export default NhifService;
//# sourceMappingURL=nhif.service.d.ts.map