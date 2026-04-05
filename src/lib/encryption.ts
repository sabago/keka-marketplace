/**
 * Data Encryption Module
 *
 * AES-256-CBC encryption for sensitive data fields.
 * Uses environment variable ENCRYPTION_KEY for the encryption key.
 *
 * Generate key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Get encryption key from environment variable
 * Throws error if key is not configured
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validate key length (must be 64 hex characters = 32 bytes)
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validate key is valid hex
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be a valid hexadecimal string');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string using AES-256-CBC
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted text in format: iv:encryptedData (both hex encoded)
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty text');
  }

  try {
    const key = getEncryptionKey();

    // Generate random initialization vector
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data separated by colon
    // Format: iv:encryptedData
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt a string encrypted with encrypt()
 *
 * @param encrypted - Encrypted text in format: iv:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty text');
  }

  try {
    const key = getEncryptionKey();

    // Split IV and encrypted data
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format. Expected format: iv:encryptedData');
    }

    const [ivHex, encryptedData] = parts;

    // Convert IV from hex to buffer
    const iv = Buffer.from(ivHex, 'hex');

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length. Expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Hash a string using SHA-256 (one-way, non-reversible)
 * Useful for data that needs to be verified but not decrypted
 *
 * @param text - Text to hash
 * @returns SHA-256 hash in hex format
 */
export function hash(text: string): string {
  if (!text) {
    throw new Error('Cannot hash empty text');
  }

  return createHash('sha256')
    .update(text)
    .digest('hex');
}

/**
 * Verify a hashed value
 *
 * @param text - Plain text to verify
 * @param hashedText - Previously hashed text to compare against
 * @returns True if text matches the hash
 */
export function verifyHash(text: string, hashedText: string): boolean {
  if (!text || !hashedText) {
    return false;
  }

  try {
    const computedHash = hash(text);
    return computedHash === hashedText;
  } catch {
    return false;
  }
}

/**
 * Encrypt sensitive fields in an object
 * Returns a new object with specified fields encrypted
 *
 * @param obj - Object containing sensitive data
 * @param fields - Array of field names to encrypt
 * @returns New object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const encrypted = { ...obj };

  for (const field of fields) {
    if (obj[field] && typeof obj[field] === 'string') {
      encrypted[field] = encrypt(obj[field] as string) as any;
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in an object
 * Returns a new object with specified fields decrypted
 *
 * @param obj - Object containing encrypted data
 * @param fields - Array of field names to decrypt
 * @returns New object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const decrypted = { ...obj };

  for (const field of fields) {
    if (obj[field] && typeof obj[field] === 'string') {
      try {
        decrypted[field] = decrypt(obj[field] as string) as any;
      } catch (error) {
        // If decryption fails, keep original value
        // This handles cases where data might not be encrypted
        console.warn(`Failed to decrypt field ${String(field)}:`, error);
      }
    }
  }

  return decrypted;
}

/**
 * Check if encryption is properly configured
 *
 * @returns True if encryption key is configured and valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Test encryption/decryption functionality
 * Useful for validating configuration
 *
 * @returns True if encryption is working correctly
 */
export function testEncryption(): boolean {
  try {
    const testString = 'Test encryption data 12345!@#$%';
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);

    return decrypted === testString;
  } catch {
    return false;
  }
}
