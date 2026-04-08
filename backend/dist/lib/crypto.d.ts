/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns hex-encoded string in the format: iv:authTag:ciphertext
 */
export declare function encrypt(text: string): string;
/**
 * Decrypts a hex-encoded ciphertext string in the format: iv:authTag:ciphertext
 * Returns the original plaintext string.
 */
export declare function decrypt(ciphertext: string): string;
/**
 * Hashes a string using SHA-256.
 * Used for refresh token storage.
 */
export declare function hashSha256(input: string): string;
/**
 * Generates a cryptographically random hex string of the given byte length.
 */
export declare function generateRandomToken(bytes?: number): string;
//# sourceMappingURL=crypto.d.ts.map