"use strict";
/**
 * ntfy.sh Integration Service
 * Handles sending push notifications via ntfy.sh
 *
 * Security: Never log topic IDs or sensitive codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
exports.send2FANotification = send2FANotification;
exports.sendPasswordResetNotification = sendPasswordResetNotification;
exports.sendAccountCreatedNotification = sendAccountCreatedNotification;
const logger_1 = require("../utils/logger");
/**
 * Send a notification to an ntfy.sh topic
 * @param topicId - Cryptographically secure topic ID (never expose)
 * @param options - Notification content and options
 * @returns Success status
 */
async function sendNotification(topicId, options) {
    const ntfyServerUrl = process.env.NTFY_SERVER_URL || 'https://ntfy.sh';
    const url = `${ntfyServerUrl}/${topicId}`;
    try {
        // Remove emojis from title for header (ntfy requires ASCII headers)
        const titleForHeader = options.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
        // Log for development (remove in production)
        if (process.env.NODE_ENV === 'development') {
            logger_1.logger.debug('Sending ntfy notification', { url: url.replace(topicId, '***') });
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Title': titleForHeader || 'Notification',
                'Priority': options.priority || 'default',
                ...(options.tags && { 'Tags': options.tags.join(',') }),
            },
            body: options.message,
        });
        if (!response.ok) {
            logger_1.logger.error('Failed to send ntfy notification', {
                status: response.status,
                statusText: response.statusText,
                url: url.replace(topicId, '***'),
            });
            return false;
        }
        logger_1.logger.debug('Notification sent successfully');
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error sending ntfy notification', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
/**
 * Send 2FA code notification
 */
async function send2FANotification(topicId, code) {
    return sendNotification(topicId, {
        title: 'Two-Factor Authentication',
        message: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.`,
        priority: 'high',
        tags: ['2fa', 'security'],
    });
}
/**
 * Send password reset notification
 */
async function sendPasswordResetNotification(topicId, resetToken) {
    return sendNotification(topicId, {
        title: 'Password Reset Request',
        message: `Your password reset token is: ${resetToken}\n\nThis token expires in 1 hour.\n\nIf you didn't request this, ignore this message.`,
        priority: 'high',
        tags: ['password-reset', 'security'],
    });
}
/**
 * Send account created notification
 */
async function sendAccountCreatedNotification(topicId) {
    return sendNotification(topicId, {
        title: 'Account Created',
        message: 'Your Stargety Oasis account has been created successfully. You can now log in.',
        priority: 'default',
        tags: ['account', 'welcome'],
    });
}
