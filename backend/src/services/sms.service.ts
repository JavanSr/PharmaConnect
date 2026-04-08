import axios from 'axios';
import { logger } from '../lib/logger';

export class SmsService {
  private username: string;
  private apiKey: string;
  private senderId: string;

  constructor() {
    this.username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
    this.apiKey = process.env.AFRICAS_TALKING_API_KEY || '';
    this.senderId = process.env.AFRICAS_TALKING_SENDER_ID || 'PharmaConn';
  }

  async sendSms(to: string | string[], message: string): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];
    if (!this.apiKey) {
      logger.warn('SMS: No API key configured, skipping send');
      return;
    }
    try {
      const params = new URLSearchParams({
        username: this.username,
        to: recipients.join(','),
        message,
        ...(this.senderId ? { from: this.senderId } : {}),
      });
      const baseUrl = this.username === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';
      const res = await axios.post(baseUrl, params.toString(), {
        headers: { 'apiKey': this.apiKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        timeout: 10000,
      });
      logger.info(`SMS sent to ${recipients.length} recipient(s): ${res.data?.SMSMessageData?.Message}`);
    } catch (err: any) {
      logger.error(`SMS send failed: ${err.message}`);
    }
  }
}
