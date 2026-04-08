import https from 'https';
import http from 'http';
import { URL } from 'url';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import redisClient from '../lib/redis';
import { logger } from '../lib/logger';

const NHIF_TOKEN_CACHE_KEY = 'nhif:auth:token';
const NHIF_TARIFF_CACHE_KEY = 'nhif:tariff:packages';
const NHIF_TOKEN_TTL_SECONDS = 55 * 60; // 55 minutes
const NHIF_TARIFF_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const REQUEST_TIMEOUT_MS = 5000;

interface NhifToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

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

interface HttpRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

type NhifResponse = Record<string, unknown> | unknown[];

function makeRequest(
  urlString: string,
  options: HttpRequestOptions
): Promise<{ status: number; body: NhifResponse; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(urlString);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method,
      headers: options.headers,
      timeout: REQUEST_TIMEOUT_MS,
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const durationMs = Date.now() - startTime;
        try {
          const body = JSON.parse(data) as NhifResponse;
          resolve({ status: res.statusCode || 0, body, durationMs });
        } catch {
          resolve({
            status: res.statusCode || 0,
            body: { raw: data } as unknown as NhifResponse,
            durationMs,
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

export class NhifService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NHIF_BASE_URL || '';
    if (!this.baseUrl) {
      logger.warn('NHIF_BASE_URL environment variable is not set');
    }
  }

  /**
   * Authenticate with NHIF Breeze API and cache the token in Redis.
   */
  private async authenticate(): Promise<string> {
    const username = process.env.NHIF_USERNAME;
    const password = process.env.NHIF_PASSWORD;

    if (!username || !password) {
      throw new Error('NHIF_USERNAME and NHIF_PASSWORD environment variables are required');
    }

    const endpoint = `${this.baseUrl}/Token/`;
    const body = new URLSearchParams({
      grant_type: 'password',
      username,
      password,
    }).toString();

    const startTime = Date.now();
    let responseBody: NhifResponse = {};
    let statusCode: number | undefined;
    let durationMs = 0;

    try {
      const result = await makeRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body).toString(),
        },
        body,
      });

      statusCode = result.status;
      responseBody = result.body;
      durationMs = result.durationMs;

      if (result.status !== 200) {
        throw new Error(`NHIF authentication failed with status ${result.status}`);
      }

      const tokenData = result.body as unknown as NhifToken;
      const token = tokenData.access_token;

      if (!token) {
        throw new Error('NHIF authentication response did not contain access_token');
      }

      // Cache the token in Redis
      await redisClient.setex(NHIF_TOKEN_CACHE_KEY, NHIF_TOKEN_TTL_SECONDS, token);

      logger.info('NHIF: Authentication successful, token cached');
      return token;
    } finally {
      await this.logApiCall(endpoint, 'POST', { grant_type: 'password', username }, responseBody, statusCode, durationMs);
    }
  }

  /**
   * Get auth headers, using cached token or re-authenticating.
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token = await redisClient.get(NHIF_TOKEN_CACHE_KEY);

    if (!token) {
      logger.info('NHIF: Token not in cache, authenticating...');
      token = await this.authenticate();
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Make an authenticated request, auto-refreshing token on 401.
   */
  private async authenticatedRequest(
    endpoint: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<NhifResponse> {
    const headers = await this.getAuthHeaders();
    const bodyString = body ? JSON.stringify(body) : undefined;

    if (bodyString) {
      headers['Content-Length'] = Buffer.byteLength(bodyString).toString();
    }

    let responseBody: NhifResponse = {};
    let statusCode: number | undefined;
    let durationMs = 0;

    try {
      const result = await makeRequest(endpoint, {
        method,
        headers,
        body: bodyString,
      });

      statusCode = result.status;
      responseBody = result.body;
      durationMs = result.durationMs;

      // Auto-refresh token on 401
      if (result.status === 401) {
        logger.info('NHIF: Token expired, re-authenticating...');
        await redisClient.del(NHIF_TOKEN_CACHE_KEY);
        const newToken = await this.authenticate();
        const newHeaders = {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        const retryResult = await makeRequest(endpoint, {
          method,
          headers: newHeaders,
          body: bodyString,
        });

        statusCode = retryResult.status;
        responseBody = retryResult.body;
        durationMs += retryResult.durationMs;

        if (retryResult.status !== 200) {
          throw new Error(`NHIF API call failed after token refresh: status ${retryResult.status}`);
        }

        return retryResult.body;
      }

      if (result.status !== 200) {
        throw new Error(`NHIF API call to ${endpoint} failed with status ${result.status}`);
      }

      return result.body;
    } finally {
      await this.logApiCall(endpoint, method, body, responseBody, statusCode, durationMs);
    }
  }

  /**
   * Verify an NHIF card number.
   */
  async verifyCard(cardNumber: string): Promise<NhifCardVerification> {
    const endpoint = `${this.baseUrl}/breeze/verification/AuthorizeCard`;
    const headers = await this.getAuthHeaders();

    const result = await makeRequest(
      `${endpoint}?CardNo=${encodeURIComponent(cardNumber)}`,
      { method: 'GET', headers }
    );

    if (result.status === 401) {
      await redisClient.del(NHIF_TOKEN_CACHE_KEY);
      const newHeaders = await this.getAuthHeaders();
      const retryResult = await makeRequest(
        `${endpoint}?CardNo=${encodeURIComponent(cardNumber)}`,
        { method: 'GET', headers: newHeaders }
      );
      return retryResult.body as unknown as NhifCardVerification;
    }

    await this.logApiCall(endpoint, 'GET', { cardNumber }, result.body, result.status, result.durationMs);
    return result.body as unknown as NhifCardVerification;
  }

  /**
   * Get detailed card information.
   */
  async getCardDetails(cardNumber: string): Promise<NhifResponse> {
    const endpoint = `${this.baseUrl}/breeze/verification/GetCardDetails?CardNo=${encodeURIComponent(cardNumber)}`;
    return this.authenticatedRequest(endpoint, 'GET');
  }

  /**
   * Get NHIF tariff (price packages). Cached for 24 hours.
   */
  async getTariff(): Promise<NhifResponse> {
    const cached = await redisClient.get(NHIF_TARIFF_CACHE_KEY);
    if (cached) {
      logger.debug('NHIF: Returning cached tariff data');
      return JSON.parse(cached) as NhifResponse;
    }

    const endpoint = `${this.baseUrl}/claimsserver/api/v1/Packages/GetPricePackageWithExcludedServices`;
    const data = await this.authenticatedRequest(endpoint, 'GET');

    await redisClient.setex(NHIF_TARIFF_CACHE_KEY, NHIF_TARIFF_TTL_SECONDS, JSON.stringify(data));
    logger.info('NHIF: Tariff data cached for 24 hours');

    return data;
  }

  /**
   * Submit a claim batch to NHIF.
   */
  async submitClaims(batch: NhifClaimBatch): Promise<NhifResponse> {
    const endpoint = `${this.baseUrl}/claimsserver/api/v1/Claims/SubmitFolios`;
    return this.authenticatedRequest(endpoint, 'POST', batch as unknown as Record<string, unknown>);
  }

  /**
   * Get the status of a submitted claim batch.
   */
  async getClaimStatus(batchRef: string): Promise<NhifResponse> {
    const endpoint = `${this.baseUrl}/claimsServer/api/v1/claims/getSubmittedClaims?batchRef=${encodeURIComponent(batchRef)}`;
    return this.authenticatedRequest(endpoint, 'GET');
  }

  /**
   * Log an API call to the NhifApiLog table.
   */
  private async logApiCall(
    endpoint: string,
    method: string,
    requestBody: Record<string, unknown> | undefined,
    responseBody: NhifResponse,
    statusCode: number | undefined,
    durationMs: number
  ): Promise<void> {
    try {
      await prisma.nhifApiLog.create({
        data: {
          endpoint,
          method,
          requestBody: requestBody as unknown as Prisma.InputJsonValue | undefined,
          responseBody: responseBody as unknown as Prisma.InputJsonValue,
          statusCode,
          durationMs: Math.round(durationMs),
        },
      });
    } catch (err) {
      logger.error('NhifService: Failed to log API call', err);
    }
  }
}

export default NhifService;
