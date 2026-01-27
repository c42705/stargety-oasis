/**
 * ntfy.sh Integration Service
 * Handles sending push notifications via ntfy.sh
 * 
 * Security: Never log topic IDs or sensitive codes
 */

import { logger } from '../utils/logger';

interface NotificationOptions {
  title: string;
  message: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
  tags?: string[];
}

/**
 * Send a notification to an ntfy.sh topic
 * @param topicId - Cryptographically secure topic ID (never expose)
 * @param options - Notification content and options
 * @returns Success status
 */
export async function sendNotification(
  topicId: string,
  options: NotificationOptions
): Promise<boolean> {
  const ntfyServerUrl = process.env.NTFY_SERVER_URL || 'https://ntfy.sh';
  const url = `${ntfyServerUrl}/${topicId}`;

  try {
    // Remove emojis from title for header (ntfy requires ASCII headers)
    const titleForHeader = options.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

    // Log for development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Sending ntfy notification', { url: url.replace(topicId, '***') });
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
      logger.error('Failed to send ntfy notification', {
        status: response.status,
        statusText: response.statusText,
        url: url.replace(topicId, '***'),
      });
      return false;
    }

    logger.debug('Notification sent successfully');
    return true;
  } catch (error) {
    logger.error('Error sending ntfy notification', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send 2FA code notification
 */
export async function send2FANotification(
  topicId: string,
  code: string
): Promise<boolean> {
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
export async function sendPasswordResetNotification(
  topicId: string,
  resetToken: string
): Promise<boolean> {
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
export async function sendAccountCreatedNotification(
  topicId: string
): Promise<boolean> {
  return sendNotification(topicId, {
    title: 'Account Created',
    message: 'Your Stargety Oasis account has been created successfully. You can now log in.',
    priority: 'default',
    tags: ['account', 'welcome'],
  });
}

