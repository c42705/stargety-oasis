"use strict";
/**
 * Authentication Controller
 * Handles auth endpoints: register, login, verify-2fa, password recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const authService_1 = require("../services/authService");
const ntfyService_1 = require("../services/ntfyService");
const router = (0, express_1.Router)();
exports.authRouter = router;
// Rate limiting state (in production, use Redis)
const loginAttempts = new Map();
const twoFAAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_2FA_ATTEMPTS = 3;
const ATTEMPT_RESET_MINUTES = 15;
/**
 * Get default blob character sprite sheet for new users
 * Returns a minimal sprite sheet definition with placeholder image
 */
function getDefaultBlobCharacterSpriteSheet() {
    const now = new Date().toISOString();
    // Minimal placeholder image (1x1 transparent pixel)
    const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return {
        id: 'blob-character-sprite-sheet',
        name: 'Blob Character',
        description: 'Default blob character sprite',
        source: {
            id: 'blob-character-source',
            name: 'Blob Character Source',
            imageData: placeholderImage,
            originalDimensions: { width: 32, height: 32 },
            format: 'image/png',
            fileSize: 1024,
            uploadedAt: now
        },
        frames: [
            {
                id: 'blob-idle-0',
                name: 'Blob Idle',
                sourceRect: { x: 0, y: 0, width: 32, height: 32 },
                outputRect: { x: 0, y: 0, width: 32, height: 32 },
                transform: {
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    flipX: false,
                    flipY: false
                },
                metadata: {
                    isEmpty: false,
                    hasTransparency: true,
                    tags: ['idle', 'blob']
                },
                animationProperties: {
                    category: 'IDLE',
                    sequenceIndex: 0
                },
                createdAt: now,
                updatedAt: now
            }
        ],
        gridLayout: {
            frameWidth: 32,
            frameHeight: 32,
            spacing: { x: 0, y: 0 },
            margin: { x: 0, y: 0 }
        },
        animations: [
            {
                id: 'blob-idle',
                category: 'IDLE',
                name: 'Idle',
                description: 'Blob idle animation',
                sequence: {
                    frameIds: ['blob-idle-0'],
                    frameRate: 8,
                    loop: true,
                    duration: 1000
                },
                priority: 1,
                interruptible: true,
                transitions: {},
                createdAt: now,
                updatedAt: now
            }
        ],
        defaultSettings: {
            frameRate: 8,
            loop: true,
            category: 'IDLE'
        },
        validation: {
            isValid: true,
            errors: [],
            warnings: [],
            lastValidated: now
        },
        exportSettings: {
            format: 'png',
            quality: 1,
            optimization: false,
            includeMetadata: true
        },
        version: '2.0.0',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
    };
}
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required',
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters',
            });
        }
        // Check if user exists
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Username or email already exists',
            });
        }
        // Hash password
        const hashedPassword = await (0, authService_1.hashPassword)(password);
        // Generate ntfy topic ID
        const ntfyTopicId = (0, authService_1.generateNtfyTopicId)(username);
        // Create user
        const user = await prisma_1.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                ntfy_topic_id: ntfyTopicId,
                two_fa_enabled: true,
            },
        });
        // Initialize 5 character slots for new user
        // Slot 1 gets the default blob character, others are empty
        const defaultBlobCharacterSpriteSheet = getDefaultBlobCharacterSpriteSheet();
        for (let slotNumber = 1; slotNumber <= 5; slotNumber++) {
            await prisma_1.prisma.character.create({
                data: {
                    userId: user.id,
                    slotNumber,
                    name: slotNumber === 1 ? 'Blob Character' : `Character ${slotNumber}`,
                    spriteSheet: slotNumber === 1 ? defaultBlobCharacterSpriteSheet : { layers: [] },
                    isEmpty: slotNumber !== 1,
                    thumbnailPath: null,
                    texturePath: null,
                },
            });
        }
        // Set active character to slot 1
        await prisma_1.prisma.activeCharacter.create({
            data: {
                userId: user.id,
                activeSlotNumber: 1,
            },
        });
        // Send welcome notification
        await (0, ntfyService_1.sendAccountCreatedNotification)(ntfyTopicId);
        logger_1.logger.info('User registered successfully', { userId: user.id, username });
        return res.status(201).json({
            success: true,
            data: {
                userId: user.id,
                username: user.username,
                email: user.email,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Registration error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
});
/**
 * POST /api/auth/login
 * Authenticate user and initiate 2FA
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required',
            });
        }
        // Check rate limiting
        const now = Date.now();
        const attempts = loginAttempts.get(username) || { count: 0, resetTime: now };
        if (attempts.count >= MAX_LOGIN_ATTEMPTS && now < attempts.resetTime) {
            return res.status(429).json({
                success: false,
                error: 'Too many login attempts. Try again later.',
            });
        }
        // Reset attempts if window expired
        if (now >= attempts.resetTime) {
            loginAttempts.delete(username);
        }
        // Find user
        const user = await prisma_1.prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            // Track failed attempt
            loginAttempts.set(username, {
                count: (attempts.count || 0) + 1,
                resetTime: now + ATTEMPT_RESET_MINUTES * 60 * 1000,
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password',
            });
        }
        // Verify password
        const passwordValid = await (0, authService_1.comparePassword)(password, user.password);
        if (!passwordValid) {
            loginAttempts.set(username, {
                count: (attempts.count || 0) + 1,
                resetTime: now + ATTEMPT_RESET_MINUTES * 60 * 1000,
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password',
            });
        }
        // Clear login attempts on success
        loginAttempts.delete(username);
        // Generate 2FA code
        const code = (0, authService_1.generate2FACode)();
        const codeHash = await (0, authService_1.hash2FACode)(code);
        const expiresAt = (0, authService_1.calculate2FAExpiration)();
        // Store code hash
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                two_fa_code_hash: codeHash,
                two_fa_code_expires_at: expiresAt,
                two_fa_attempts: 0,
            },
        });
        // Send 2FA code via ntfy
        if (process.env.NODE_ENV === 'development') {
            logger_1.logger.debug('User ntfy_topic_id check', {
                userId: user.id,
                hasTopicId: !!user.ntfy_topic_id,
                topicIdLength: user.ntfy_topic_id?.length || 0
            });
        }
        if (user.ntfy_topic_id) {
            await (0, ntfyService_1.send2FANotification)(user.ntfy_topic_id, code);
        }
        else {
            logger_1.logger.warn('No ntfy topic ID for user', { userId: user.id });
        }
        // Log code for development (remove in production)
        if (process.env.NODE_ENV === 'development') {
            logger_1.logger.debug('2FA code generated', { userId: user.id, code });
        }
        logger_1.logger.info('Login initiated, 2FA code sent', { userId: user.id });
        return res.status(200).json({
            success: true,
            data: {
                requiresTwoFactor: true,
                userId: user.id,
                ntfy_topic_id: user.ntfy_topic_id,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});
/**
 * POST /api/auth/verify-2fa
 * Verify 2FA code and create session
 */
router.post('/verify-2fa', async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) {
            return res.status(400).json({
                success: false,
                error: 'User ID and code are required',
            });
        }
        // Find user
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        // Check rate limiting
        const now = Date.now();
        const attempts = twoFAAttempts.get(userId) || { count: 0, resetTime: now };
        if (attempts.count >= MAX_2FA_ATTEMPTS && now < attempts.resetTime) {
            return res.status(429).json({
                success: false,
                error: 'Too many verification attempts. Try again later.',
            });
        }
        // Reset attempts if window expired
        if (now >= attempts.resetTime) {
            twoFAAttempts.delete(userId);
        }
        // Check if code is expired
        if ((0, authService_1.is2FACodeExpired)(user.two_fa_code_expires_at)) {
            return res.status(400).json({
                success: false,
                error: 'Verification code has expired',
            });
        }
        // Verify code
        const codeValid = user.two_fa_code_hash
            ? await (0, authService_1.verify2FACode)(code, user.two_fa_code_hash)
            : false;
        if (!codeValid) {
            twoFAAttempts.set(userId, {
                count: (attempts.count || 0) + 1,
                resetTime: now + ATTEMPT_RESET_MINUTES * 60 * 1000,
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid verification code',
            });
        }
        // Clear 2FA code and attempts
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                two_fa_code_hash: null,
                two_fa_code_expires_at: null,
                two_fa_attempts: 0,
            },
        });
        twoFAAttempts.delete(userId);
        // Generate session token
        const token = (0, authService_1.generateSessionToken)(user.id, user.username, user.email);
        logger_1.logger.info('2FA verification successful', { userId });
        return res.status(200).json({
            success: true,
            data: {
                userId: user.id,
                username: user.username,
                email: user.email,
                token,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('2FA verification error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: '2FA verification failed',
        });
    }
});
/**
 * POST /api/auth/request-password-reset
 * Request password reset token
 */
router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required',
            });
        }
        // Find user by email
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        // Verify user exists
        if (!user) {
            logger_1.logger.warn('Password reset requested for non-existent email', { email });
            return res.status(400).json({
                success: false,
                error: 'Email not found. Please check and try again.',
            });
        }
        // Generate reset token
        const resetToken = (0, authService_1.generatePasswordResetToken)();
        const expiresAt = (0, authService_1.calculatePasswordResetExpiration)();
        // Store token in database
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password_reset_token: resetToken,
                password_reset_expires_at: expiresAt,
            },
        });
        // Send reset token via ntfy if user has ntfy topic configured
        if (user.ntfy_topic_id) {
            await (0, ntfyService_1.sendPasswordResetNotification)(user.ntfy_topic_id, resetToken);
            logger_1.logger.info('Password reset token sent via ntfy', { userId: user.id, email });
        }
        else {
            logger_1.logger.warn('User has no ntfy topic configured', { userId: user.id, email });
        }
        // Log token for development (remove in production)
        if (process.env.NODE_ENV === 'development') {
            logger_1.logger.debug('Password reset token generated', { userId: user.id, token: resetToken });
        }
        logger_1.logger.info('Password reset requested successfully', { userId: user.id, email });
        return res.status(200).json({
            success: true,
            message: 'Password reset token has been sent to your email',
        });
    }
    catch (error) {
        logger_1.logger.error('Password reset request error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: 'Password reset request failed',
        });
    }
});
/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token and new password are required',
            });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters',
            });
        }
        // Find user with token
        const user = await prisma_1.prisma.user.findFirst({
            where: { password_reset_token: token },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired reset token',
            });
        }
        // Check if token is expired
        if ((0, authService_1.isPasswordResetTokenExpired)(user.password_reset_expires_at)) {
            return res.status(401).json({
                success: false,
                error: 'Reset token has expired',
            });
        }
        // Hash new password
        const hashedPassword = await (0, authService_1.hashPassword)(newPassword);
        // Update password and clear token
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                password_reset_token: null,
                password_reset_expires_at: null,
            },
        });
        logger_1.logger.info('Password reset successfully', { userId: user.id });
        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Password reset error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            success: false,
            error: 'Password reset failed',
        });
    }
});
