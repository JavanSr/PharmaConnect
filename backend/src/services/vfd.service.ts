import https from 'https';
import http from 'http';
import { URL } from 'url';
import redisClient from '../lib/redis';
import { logger } from '../lib/logger';

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

interface VfdApiResponse {
  RCTNUM?: string;
  ReceiptNumber?: string;
  RCTNum?: string;
  status?: string;
  [key: string]: unknown;
}

const VFD_TIMEOUT_MS = 5000;
const VFD_QUEUE_PREFIX = 'vfd:queue:';

function makeVfdRequest(
  urlString: string,
  method: string,
  body: Record<string, unknown>,
  certPath?: string,
  certPassword?: string
): Promise<{ status: number; body: VfdApiResponse }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlString);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyString = JSON.stringify(body);

    const reqOptions: https.RequestOptions = {
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
        const fs = require('fs') as typeof import('fs');
        const pfx = fs.readFileSync(certPath);
        (reqOptions as https.RequestOptions).pfx = pfx;
        (reqOptions as https.RequestOptions).passphrase = certPassword;
        (reqOptions as https.RequestOptions).rejectUnauthorized = true;
      } catch (err) {
        logger.warn('VfdService: Could not load TRA certificate, proceeding without it');
      }
    }

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as VfdApiResponse;
          resolve({ status: res.statusCode || 0, body: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, body: { raw: data } as VfdApiResponse });
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

export class VfdService {
  private vfdUrl: string;
  private certPath: string | undefined;
  private certPassword: string | undefined;

  constructor() {
    this.vfdUrl = process.env.TRA_VFD_URL || '';
    this.certPath = process.env.TRA_CERTIFICATE_PATH;
    this.certPassword = process.env.TRA_CERTIFICATE_PASSWORD;

    if (!this.vfdUrl) {
      logger.warn('VfdService: TRA_VFD_URL not set. Receipts will be queued.');
    }
  }

  /**
   * Generate a VFD receipt for a dispensing transaction.
   * Falls back to QUEUED status if the VFD endpoint is unavailable.
   */
  async generateReceipt(transactionData: VfdTransaction): Promise<VfdReceiptResponse> {
    if (!this.vfdUrl) {
      logger.warn(
        `VfdService: No VFD URL configured. Queuing receipt for event ${transactionData.dispensingEventId}`
      );
      await this.queueReceipt(transactionData);
      return { receiptNumber: null, status: 'QUEUED' };
    }

    const payload = this.buildVfdPayload(transactionData);

    try {
      const result = await makeVfdRequest(
        this.vfdUrl,
        'POST',
        payload,
        this.certPath,
        this.certPassword
      );

      if (result.status === 200) {
        const receiptNumber =
          result.body.RCTNUM ||
          result.body.ReceiptNumber ||
          result.body.RCTNum ||
          null;

        if (receiptNumber) {
          logger.info(
            `VfdService: Receipt generated for event ${transactionData.dispensingEventId}: ${receiptNumber}`
          );
          return { receiptNumber: String(receiptNumber), status: 'SUCCESS' };
        }
      }

      logger.warn(
        `VfdService: Unexpected VFD response (status ${result.status}) for event ${transactionData.dispensingEventId}. Queuing.`
      );
      await this.queueReceipt(transactionData);
      return { receiptNumber: null, status: 'QUEUED' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn(
        `VfdService: Failed to generate receipt for event ${transactionData.dispensingEventId}: ${errorMessage}. Queuing.`
      );
      await this.queueReceipt(transactionData);
      return { receiptNumber: null, status: 'QUEUED' };
    }
  }

  /**
   * Retry a queued VFD receipt.
   * Returns the receipt response, or throws if retry fails.
   */
  async retryQueuedReceipt(dispensingEventId: string): Promise<VfdReceiptResponse> {
    const queueKey = `${VFD_QUEUE_PREFIX}${dispensingEventId}`;
    const queuedData = await redisClient.get(queueKey);

    if (!queuedData) {
      throw new Error(`No queued VFD receipt found for event ${dispensingEventId}`);
    }

    const transactionData = JSON.parse(queuedData) as VfdTransaction;
    const payload = this.buildVfdPayload(transactionData);

    const result = await makeVfdRequest(
      this.vfdUrl,
      'POST',
      payload,
      this.certPath,
      this.certPassword
    );

    if (result.status === 200) {
      const receiptNumber =
        result.body.RCTNUM ||
        result.body.ReceiptNumber ||
        result.body.RCTNum ||
        null;

      if (receiptNumber) {
        // Remove from queue on success
        await redisClient.del(queueKey);
        logger.info(
          `VfdService: Queued receipt processed for event ${dispensingEventId}: ${receiptNumber}`
        );
        return { receiptNumber: String(receiptNumber), status: 'SUCCESS' };
      }
    }

    throw new Error(`VFD retry failed with status ${result.status}`);
  }

  /**
   * Get all queued VFD dispensing event IDs from Redis.
   */
  async getQueuedEventIds(): Promise<string[]> {
    const keys = await redisClient.keys(`${VFD_QUEUE_PREFIX}*`);
    return keys.map((key) => key.replace(VFD_QUEUE_PREFIX, ''));
  }

  /**
   * Queue a transaction for retry.
   */
  private async queueReceipt(transactionData: VfdTransaction): Promise<void> {
    const queueKey = `${VFD_QUEUE_PREFIX}${transactionData.dispensingEventId}`;
    // Store for 7 days
    await redisClient.setex(queueKey, 7 * 24 * 60 * 60, JSON.stringify(transactionData));
    logger.info(`VfdService: Queued receipt for event ${transactionData.dispensingEventId}`);
  }

  /**
   * Build the TRA VFD API payload.
   */
  private buildVfdPayload(tx: VfdTransaction): Record<string, unknown> {
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

export default VfdService;
