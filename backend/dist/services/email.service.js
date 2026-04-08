"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../lib/logger");
class EmailService {
    transporter;
    fromAddress;
    constructor() {
        const apiKey = process.env.SENDGRID_API_KEY;
        this.fromAddress = process.env.EMAIL_FROM || 'noreply@pharmaconnect.co.tz';
        if (!apiKey) {
            logger_1.logger.warn('SENDGRID_API_KEY not set. Email sending will fail.');
        }
        this.transporter = nodemailer_1.default.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false, // STARTTLS
            auth: {
                user: 'apikey',
                pass: apiKey || '',
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
        });
    }
    /**
     * Send a single email.
     */
    async sendEmail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to,
                subject,
                html,
            });
            logger_1.logger.info(`EmailService: Email sent to ${to}. MessageId: ${info.messageId}`);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger_1.logger.error(`EmailService: Failed to send email to ${to}: ${errorMessage}`);
            throw new Error(`Email delivery failed: ${errorMessage}`);
        }
    }
    /**
     * Send the weekly digest to a list of subscribers.
     * Uses BCC-style sending to protect subscriber privacy.
     */
    async sendWeeklyDigest(subscribers, articles) {
        if (subscribers.length === 0) {
            logger_1.logger.info('EmailService: No subscribers for weekly digest, skipping');
            return;
        }
        if (articles.length === 0) {
            logger_1.logger.info('EmailService: No new articles for weekly digest, skipping');
            return;
        }
        const frontendUrl = process.env.FRONTEND_URL || 'https://pharmaconnect.co.tz';
        const articlesHtml = articles
            .map((article) => `
      <div style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 24px;">
        ${article.featuredImage
            ? `<img src="${article.featuredImage}" alt="${article.title}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;" />`
            : ''}
        <span style="background: #e8f4fd; color: #1a73e8; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${article.category}</span>
        <h3 style="margin: 8px 0; font-size: 18px;">
          <a href="${frontendUrl}/knowledge/${article.slug}" style="color: #1a73e8; text-decoration: none;">${article.title}</a>
        </h3>
        <p style="color: #666; font-size: 14px; margin: 0;">
          ${article.authorName ? `By ${article.authorName} · ` : ''}${article.readingTimeMinutes} min read
        </p>
      </div>
      `)
            .join('');
        const digestHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PharmaConnect Weekly Digest</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">PharmaConnect</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Your Weekly Pharmacy Digest</p>
          </div>

          <!-- Content -->
          <div style="padding: 32px 24px;">
            <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 24px;">This Week's Articles</h2>
            ${articlesHtml}

            <div style="text-align: center; margin-top: 32px;">
              <a href="${frontendUrl}/knowledge" style="background: #1a73e8; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Read All Articles
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 13px; margin: 0 0 8px;">
              You're receiving this because you subscribed to PharmaConnect updates.
            </p>
            <p style="color: #888; font-size: 13px; margin: 0;">
              <a href="${frontendUrl}/unsubscribe?token={{UNSUBSCRIBE_TOKEN}}" style="color: #1a73e8; text-decoration: none;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
        // Send individually to protect subscriber privacy and enable unsubscribe tokens
        const results = await Promise.allSettled(subscribers.map((subscriberEmail) => this.transporter.sendMail({
            from: this.fromAddress,
            to: subscriberEmail,
            subject: `PharmaConnect Weekly Digest — ${new Date().toLocaleDateString('en-TZ', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })}`,
            html: digestHtml,
        })));
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;
        logger_1.logger.info(`EmailService: Weekly digest sent. Success: ${succeeded}, Failed: ${failed}, Total: ${subscribers.length}`);
        if (failed > 0) {
            const failures = results
                .map((r, i) => ({ result: r, email: subscribers[i] }))
                .filter(({ result }) => result.status === 'rejected');
            failures.forEach(({ result, email }) => {
                const reason = result.status === 'rejected' ? result.reason : '';
                logger_1.logger.warn(`EmailService: Failed to send digest to ${email}: ${reason}`);
            });
        }
    }
    /**
     * Send a password reset email.
     */
    async sendPasswordReset(to, resetToken) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://pharmaconnect.co.tz';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
        await this.sendEmail(to, 'PharmaConnect — Password Reset Request', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to set a new password.</p>
        <p>This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="background: #1a73e8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px;">If you didn't request this, please ignore this email.</p>
      </div>
      `);
    }
    /**
     * Send a compliance expiry alert email.
     */
    async sendComplianceAlertEmail(to, itemName, daysUntilExpiry, pharmacyName) {
        const subject = daysUntilExpiry <= 0
            ? `URGENT: ${itemName} Licence Has Expired — ${pharmacyName}`
            : `Action Required: ${itemName} Expires in ${daysUntilExpiry} Days — ${pharmacyName}`;
        const urgencyColor = daysUntilExpiry <= 0 ? '#d32f2f' : daysUntilExpiry <= 7 ? '#f57c00' : '#1a73e8';
        const urgencyText = daysUntilExpiry <= 0
            ? 'EXPIRED'
            : daysUntilExpiry <= 7
                ? `EXPIRES IN ${daysUntilExpiry} DAYS`
                : `Expires in ${daysUntilExpiry} days`;
        await this.sendEmail(to, subject, `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
          <strong style="font-size: 18px;">${urgencyText}</strong>
        </div>
        <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1a1a1a;">Compliance Alert: ${itemName}</h2>
          <p>The following compliance item for <strong>${pharmacyName}</strong> requires your attention:</p>
          <ul>
            <li><strong>Item:</strong> ${itemName}</li>
            <li><strong>Status:</strong> <span style="color: ${urgencyColor};">${urgencyText}</span></li>
          </ul>
          <p>Please log in to PharmaConnect to take action and upload the renewed document.</p>
          <a href="${process.env.FRONTEND_URL || 'https://pharmaconnect.co.tz'}/compliance"
             style="background: ${urgencyColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            View Compliance Dashboard
          </a>
        </div>
      </div>
      `);
    }
}
exports.EmailService = EmailService;
exports.default = EmailService;
//# sourceMappingURL=email.service.js.map