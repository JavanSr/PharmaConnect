"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VfdService = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const redis_1 = __importDefault(require("../lib/redis"));
const logger_1 = require("../lib/logger");
const VFD_TIMEOUT_MS = 5000;
const VFD_QUEUE_PREFIX = 'vfd:queue:';
function makeVfdRequest(urlString, method, body, certPath, certPassword) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new url_1.URL(urlString);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https_1.default : http_1.default;
        const bodyString = JSON.stringify(body);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyString),
            },
            timeout: VFD_TIMEOUT_MS,
        };
        // Attach client certificate if provided
        if (isHttps && certPath) {
            try {
                const fs = require('fs');
                const pfx = fs.readFileSync(certPath);
                reqOptions.pfx = pfx;
                reqOptions.passphrase = certPassword;
                reqOptions.rejectUnauthorized = true;
            }
            catch (err) {
                logger_1.logger.warn('VfdService: Could not load TRA certificate, proceeding without it');
            }
        }
        const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode || 0, body: parsed });
                }
                catch {
                    resolve({ status: res.statusCode || 0, body: { raw: data } });
                }
            });
        });
        req.on('timeout', () => {
            req.destroy(new Error(`VFD request timed out after ${VFD_TIMEOUT_MS}ms`));
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.write(bodyString);
        req.end();
    });
}
class VfdService {
    vfdUrl;
    certPath;
    certPassword;
    constructor() {
        this.vfdUrl = process.env.TRA_VFD_URL || '';
        this.certPath = process.env.TRA_CERTIFICATE_PATH;
        this.certPassword = process.env.TRA_CERTIFICATE_PASSWORD;
        if (!this.vfdUrl) {
            logger_1.logger.warn('VfdService: TRA_VFD_URL not set. Receipts will be queued.');
        }
    }
    /**
     * Generate a VFD receipt for a dispensing transaction.
     * Falls back to QUEUED status if the VFD endpoint is unavailable.
     */
    async generateReceipt(transactionData) {
        if (!this.vfdUrl) {
            logger_1.logger.warn(`VfdService: No VFD URL configured. Queuing receipt for event ${transactionData.dispensingEventId}`);
            await this.queueReceipt(transactionData);
            return { receiptNumber: null, status: 'QUEUED' };
        }
        const payload = this.buildVfdPayload(transactionData);
        try {
            const result = await makeVfdRequest(this.vfdUrl, 'POST', payload, this.certPath, this.certPassword);
            if (result.status === 200) {
                const receiptNumber = result.body.RCTNUM ||
                    result.body.ReceiptNumber ||
                    result.body.RCTNum ||
                    null;
                if (receiptNumber) {
                    logger_1.logger.info(`VfdService: Receipt generated for event ${transactionData.dispensingEventId}: ${receiptNumber}`);
                    return { receiptNumber: String(receiptNumber), status: 'SUCCESS' };
                }
            }
            logger_1.logger.warn(`VfdService: Unexpected VFD response (status ${result.status}) for event ${transactionData.dispensingEventId}. Queuing.`);
            await this.queueReceipt(transactionData);
            return { receiptNumber: null, status: 'QUEUED' };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger_1.logger.warn(`VfdService: Failed to generate receipt for event ${transactionData.dispensingEventId}: ${errorMessage}. Queuing.`);
            await this.queueReceipt(transactionData);
            return { receiptNumber: null, status: 'QUEUED' };
        }
    }
    /**
     * Retry a queued VFD receipt.
     * Returns the receipt response, or throws if retry fails.
     */
    async retryQueuedReceipt(dispensingEventId) {
        const queueKey = `${VFD_QUEUE_PREFIX}${dispensingEventId}`;
        const queuedData = await redis_1.default.get(queueKey);
        if (!queuedData) {
            throw new Error(`No queued VFD receipt found for event ${dispensingEventId}`);
        }
        const transactionData = JSON.parse(queuedData);
        const payload = this.buildVfdPayload(transactionData);
        const result = await makeVfdRequest(this.vfdUrl, 'POST', payload, this.certPath, this.certPassword);
        if (result.status === 200) {
            const receiptNumber = result.body.RCTNUM ||
                result.body.ReceiptNumber ||
                result.body.RCTNum ||
                null;
            if (receiptNumber) {
                // Remove from queue on success
                await redis_1.default.del(queueKey);
                logger_1.logger.info(`VfdService: Queued receipt processed for event ${dispensingEventId}: ${receiptNumber}`);
                return { receiptNumber: String(receiptNumber), status: 'SUCCESS' };
            }
        }
        throw new Error(`VFD retry failed with status ${result.status}`);
    }
    /**
     * Get all queued VFD dispensing event IDs from Redis.
     */
    async getQueuedEventIds() {
        const keys = await redis_1.default.keys(`${VFD_QUEUE_PREFIX}*`);
        return keys.map((key) => key.replace(VFD_QUEUE_PREFIX, ''));
    }
    /**
     * Queue a transaction for retry.
     */
    async queueReceipt(transactionData) {
        const queueKey = `${VFD_QUEUE_PREFIX}${transactionData.dispensingEventId}`;
        // Store for 7 days
        await redis_1.default.setex(queueKey, 7 * 24 * 60 * 60, JSON.stringify(transactionData));
        logger_1.logger.info(`VfdService: Queued receipt for event ${transactionData.dispensingEventId}`);
    }
    /**
     * Build the TRA VFD API payload.
     */
    buildVfdPayload(tx) {
        return {
            TIN: tx.pharmacyTin,
            REGID: tx.dispensingEventId,
            DATE: new Date().toISOString().split('T')[0],
            TIME: new Date().toTimeString().split(' ')[0],
            INVNUM: tx.dispensingEventId,
            TOTALTAXEXCL: tx.amount,
            TOTALTAXINCL: tx.amount,
            ITEMS: tx.items.map((item) => ({
                DESC: item.name,
                QTY: item.qty,
                AMT: item.price * item.qty,
                TAXCODE: 1,
                TAXRATE: 18,
            })),
        };
    }
}
exports.VfdService = VfdService;
exports.default = VfdService;
//# sourceMappingURL=vfd.service.js.map