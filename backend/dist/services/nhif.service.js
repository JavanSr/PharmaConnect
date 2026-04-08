"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NhifService = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const prisma_1 = __importDefault(require("../lib/prisma"));
const redis_1 = __importDefault(require("../lib/redis"));
const logger_1 = require("../lib/logger");
const NHIF_TOKEN_CACHE_KEY = 'nhif:auth:token';
const NHIF_TARIFF_CACHE_KEY = 'nhif:tariff:packages';
const NHIF_TOKEN_TTL_SECONDS = 55 * 60; // 55 minutes
const NHIF_TARIFF_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const REQUEST_TIMEOUT_MS = 5000;
function makeRequest(urlString, options) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const parsedUrl = new url_1.URL(urlString);
        const isHttps = parsedUrl.protocol === 'https:';
        const lib = isHttps ? https_1.default : http_1.default;
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
                    const body = JSON.parse(data);
                    resolve({ status: res.statusCode || 0, body, durationMs });
                }
                catch {
                    resolve({
                        status: res.statusCode || 0,
                        body: { raw: data },
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
class NhifService {
    baseUrl;
    constructor() {
        this.baseUrl = process.env.NHIF_BASE_URL || '';
        if (!this.baseUrl) {
            logger_1.logger.warn('NHIF_BASE_URL environment variable is not set');
        }
    }
    /**
     * Authenticate with NHIF Breeze API and cache the token in Redis.
     */
    async authenticate() {
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
        let responseBody = {};
        let statusCode;
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
            const tokenData = result.body;
            const token = tokenData.access_token;
            if (!token) {
                throw new Error('NHIF authentication response did not contain access_token');
            }
            // Cache the token in Redis
            await redis_1.default.setex(NHIF_TOKEN_CACHE_KEY, NHIF_TOKEN_TTL_SECONDS, token);
            logger_1.logger.info('NHIF: Authentication successful, token cached');
            return token;
        }
        finally {
            await this.logApiCall(endpoint, 'POST', { grant_type: 'password', username }, responseBody, statusCode, durationMs);
        }
    }
    /**
     * Get auth headers, using cached token or re-authenticating.
     */
    async getAuthHeaders() {
        let token = await redis_1.default.get(NHIF_TOKEN_CACHE_KEY);
        if (!token) {
            logger_1.logger.info('NHIF: Token not in cache, authenticating...');
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
    async authenticatedRequest(endpoint, method, body) {
        const headers = await this.getAuthHeaders();
        const bodyString = body ? JSON.stringify(body) : undefined;
        if (bodyString) {
            headers['Content-Length'] = Buffer.byteLength(bodyString).toString();
        }
        let responseBody = {};
        let statusCode;
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
                logger_1.logger.info('NHIF: Token expired, re-authenticating...');
                await redis_1.default.del(NHIF_TOKEN_CACHE_KEY);
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
        }
        finally {
            await this.logApiCall(endpoint, method, body, responseBody, statusCode, durationMs);
        }
    }
    /**
     * Verify an NHIF card number.
     */
    async verifyCard(cardNumber) {
        const endpoint = `${this.baseUrl}/breeze/verification/AuthorizeCard`;
        const headers = await this.getAuthHeaders();
        const result = await makeRequest(`${endpoint}?CardNo=${encodeURIComponent(cardNumber)}`, { method: 'GET', headers });
        if (result.status === 401) {
            await redis_1.default.del(NHIF_TOKEN_CACHE_KEY);
            const newHeaders = await this.getAuthHeaders();
            const retryResult = await makeRequest(`${endpoint}?CardNo=${encodeURIComponent(cardNumber)}`, { method: 'GET', headers: newHeaders });
            return retryResult.body;
        }
        await this.logApiCall(endpoint, 'GET', { cardNumber }, result.body, result.status, result.durationMs);
        return result.body;
    }
    /**
     * Get detailed card information.
     */
    async getCardDetails(cardNumber) {
        const endpoint = `${this.baseUrl}/breeze/verification/GetCardDetails?CardNo=${encodeURIComponent(cardNumber)}`;
        return this.authenticatedRequest(endpoint, 'GET');
    }
    /**
     * Get NHIF tariff (price packages). Cached for 24 hours.
     */
    async getTariff() {
        const cached = await redis_1.default.get(NHIF_TARIFF_CACHE_KEY);
        if (cached) {
            logger_1.logger.debug('NHIF: Returning cached tariff data');
            return JSON.parse(cached);
        }
        const endpoint = `${this.baseUrl}/claimsserver/api/v1/Packages/GetPricePackageWithExcludedServices`;
        const data = await this.authenticatedRequest(endpoint, 'GET');
        await redis_1.default.setex(NHIF_TARIFF_CACHE_KEY, NHIF_TARIFF_TTL_SECONDS, JSON.stringify(data));
        logger_1.logger.info('NHIF: Tariff data cached for 24 hours');
        return data;
    }
    /**
     * Submit a claim batch to NHIF.
     */
    async submitClaims(batch) {
        const endpoint = `${this.baseUrl}/claimsserver/api/v1/Claims/SubmitFolios`;
        return this.authenticatedRequest(endpoint, 'POST', batch);
    }
    /**
     * Get the status of a submitted claim batch.
     */
    async getClaimStatus(batchRef) {
        const endpoint = `${this.baseUrl}/claimsServer/api/v1/claims/getSubmittedClaims?batchRef=${encodeURIComponent(batchRef)}`;
        return this.authenticatedRequest(endpoint, 'GET');
    }
    /**
     * Log an API call to the NhifApiLog table.
     */
    async logApiCall(endpoint, method, requestBody, responseBody, statusCode, durationMs) {
        try {
            await prisma_1.default.nhifApiLog.create({
                data: {
                    endpoint,
                    method,
                    requestBody: requestBody,
                    responseBody: responseBody,
                    statusCode,
                    durationMs: Math.round(durationMs),
                },
            });
        }
        catch (err) {
            logger_1.logger.error('NhifService: Failed to log API call', err);
        }
    }
}
exports.NhifService = NhifService;
exports.default = NhifService;
//# sourceMappingURL=nhif.service.js.map