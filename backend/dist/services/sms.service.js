"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../lib/logger");
class SmsService {
    username;
    apiKey;
    senderId;
    constructor() {
        this.username = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
        this.apiKey = process.env.AFRICAS_TALKING_API_KEY || '';
        this.senderId = process.env.AFRICAS_TALKING_SENDER_ID || 'PharmaConn';
    }
    async sendSms(to, message) {
        const recipients = Array.isArray(to) ? to : [to];
        if (!this.apiKey) {
            logger_1.logger.warn('SMS: No API key configured, skipping send');
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
            const res = await axios_1.default.post(baseUrl, params.toString(), {
                headers: { 'apiKey': this.apiKey, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
                timeout: 10000,
            });
            logger_1.logger.info(`SMS sent to ${recipients.length} recipient(s): ${res.data?.SMSMessageData?.Message}`);
        }
        catch (err) {
            logger_1.logger.error(`SMS send failed: ${err.message}`);
        }
    }
}
exports.SmsService = SmsService;
//# sourceMappingURL=sms.service.js.map