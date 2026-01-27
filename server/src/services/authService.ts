/**
 * Authentication Service
 * Handles password hashing, token generation, and 2FA code management
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;
const TWO_FA_CODE_LENGTH = 6;
const TWO_FA_EXPIRY_MINUTES = parseInt(process.env.TWO_FA_CODE_EXPIRY_MINUTES || '5', 10);

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    logger.error('Error hashing password', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error comparing password', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Generate cryptographically secure ntfy topic ID
 * Format: 2fa-{randomHash} (max 64 chars for ntfy.sh compatibility)
 * Uses 16 bytes (32 hex chars) of random data for security
 */
export function generateNtfyTopicId(userId: string): string {
  // Use 16 bytes of random data (32 hex chars) for strong security
  // Total length: "2fa-" (4) + 32 hex chars = 36 chars (well under 64 char limit)
  const randomHash = crypto.randomBytes(16).toString('hex');
  return `2fa-${randomHash}`;
}

/**
 * Generate 6-digit 2FA code
 */
export function generate2FACode(): string {
  const code = crypto.randomInt(0, 1000000);
  return String(code).padStart(TWO_FA_CODE_LENGTH, '0');
}

/**
 * Hash 2FA code for storage
 */
export async function hash2FACode(code: string): Promise<string> {
  try {
    return await bcrypt.hash(code, SALT_ROUNDS);
  } catch (error) {
    logger.error('Error hashing 2FA code', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Verify 2FA code against hash
 */
export async function verify2FACode(code: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(code, hash);
  } catch (error) {
    logger.error('Error verifying 2FA code', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate 2FA code expiration time
 */
export function calculate2FAExpiration(): Date {
  return new Date(Date.now() + TWO_FA_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Calculate password reset token expiration (1 hour)
 */
export function calculatePasswordResetExpiration(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

/**
 * Check if 2FA code is expired
 */
export function is2FACodeExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}

/**
 * Check if password reset token is expired
 */
export function isPasswordResetTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}

/**
 * Generate session token (simple base64 encoded user data)
 * TODO: Replace with proper JWT implementation
 */
export function generateSessionToken(userId: string, username: string, email: string): string {
  const tokenData = JSON.stringify({ userId, username, email, iat: Date.now() });
  return Buffer.from(tokenData).toString('base64');
}

