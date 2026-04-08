interface ArticleSummary {
    title: string;
    slug: string;
    category: string;
    readingTimeMinutes: number;
    featuredImage?: string;
    authorName?: string;
}
export declare class EmailService {
    private transporter;
    private fromAddress;
    constructor();
    /**
     * Send a single email.
     */
    sendEmail(to: string, subject: string, html: string): Promise<void>;
    /**
     * Send the weekly digest to a list of subscribers.
     * Uses BCC-style sending to protect subscriber privacy.
     */
    sendWeeklyDigest(subscribers: string[], articles: ArticleSummary[]): Promise<void>;
    /**
     * Send a password reset email.
     */
    sendPasswordReset(to: string, resetToken: string): Promise<void>;
    /**
     * Send a compliance expiry alert email.
     */
    sendComplianceAlertEmail(to: string, itemName: string, daysUntilExpiry: number, pharmacyName: string): Promise<void>;
}
export default EmailService;
//# sourceMappingURL=email.service.d.ts.map