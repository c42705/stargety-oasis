"use strict";
/**
 * Authentication Service
 * Handles password hashing, token generation, and 2FA code management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateNtfyTopicId = generateNtfyTopicId;
exports.generate2FACode = generate2FACode;
exports.hash2FACode = hash2FACode;
exports.verify2FACode = verify2FACode;
exports.generatePasswordResetToken = generatePasswordResetToken;
exports.calculate2FAExpiration = calculate2FAExpiration;
exports.calculatePasswordResetExpiration = calculatePasswordResetExpiration;
exports.is2FACodeExpired = is2FACodeExpired;
exports.isPasswordResetTokenExpired = isPasswordResetTokenExpired;
exports.generateSessionToken = generateSessionToken;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = require("../utils/logger");
const SALT_ROUNDS = 10;
const TWO_FA_CODE_LENGTH = 6;
const TWO_FA_EXPIRY_MINUTES = parseInt(process.env.TWO_FA_CODE_EXPIRY_MINUTES || '5', 10);
/**
 * Hash a password using bcryptjs
 */
async function hashPassword(password) {
    try {
        return await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    }
    catch (error) {
        logger_1.logger.error('Error hashing password', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
    try {
        return await bcryptjs_1.default.compare(password, hash);
    }
    catch (error) {
        logger_1.logger.error('Error comparing password', {
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
function generateNtfyTopicId(userId) {
    // Use 16 bytes of random data (32 hex chars) for strong security
    // Total length: "2fa-" (4) + 32 hex chars = 36 chars (well under 64 char limit)
    const randomHash = crypto_1.default.randomBytes(16).toString('hex');
    return `2fa-${randomHash}`;
}
/**
 * Generate 6-digit 2FA code
 */
function generate2FACode() {
    const code = crypto_1.default.randomInt(0, 1000000);
    return String(code).padStart(TWO_FA_CODE_LENGTH, '0');
}
/**
 * Hash 2FA code for storage
 */
async function hash2FACode(code) {
    try {
        return await bcryptjs_1.default.hash(code, SALT_ROUNDS);
    }
    catch (error) {
        logger_1.logger.error('Error hashing 2FA code', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
/**
 * Verify 2FA code against hash
 */
async function verify2FACode(code, hash) {
    try {
        return await bcryptjs_1.default.compare(code, hash);
    }
    catch (error) {
        logger_1.logger.error('Error verifying 2FA code', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
/**
 * Generate password reset token
 */
function generatePasswordResetToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Calculate 2FA code expiration time
 */
function calculate2FAExpiration() {
    return new Date(Date.now() + TWO_FA_EXPIRY_MINUTES * 60 * 1000);
}
/**
 * Calculate password reset token expiration (1 hour)
 */
function calculatePasswordResetExpiration() {
    return new Date(Date.now() + 60 * 60 * 1000);
}
/**
 * Check if 2FA code is expired
 */
function is2FACodeExpired(expiresAt) {
    if (!expiresAt)
        return true;
    return new Date() > expiresAt;
}
/**
 * Check if password reset token is expired
 */
function isPasswordResetTokenExpired(expiresAt) {
    if (!expiresAt)
        return true;
    return new Date() > expiresAt;
}
/**
 * Generate session token (simple base64 encoded user data)
 * TODO: Replace with proper JWT implementation
 */
function generateSessionToken(userId, username, email) {
    const tokenData = JSON.stringify({ userId, username, email, iat: Date.now() });
    return Buffer.from(tokenData).toString('base64');
}
