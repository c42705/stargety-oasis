import { VALIDATION } from './constants';
import { AppError, User, Room } from './types';

// String utilities
export const formatUsername = (username: string): string => {
  return username.trim().replace(/\s+/g, '_').toLowerCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Date utilities
export const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  return VALIDATION.EMAIL_REGEX.test(email);
};

export const validateUsername = (username: string): boolean => {
  return (
    username.length >= VALIDATION.MIN_USERNAME_LENGTH &&
    username.length <= VALIDATION.MAX_USERNAME_LENGTH &&
    VALIDATION.USERNAME_REGEX.test(username)
  );
};

export const validatePassword = (password: string): boolean => {
  return (
    password.length >= VALIDATION.MIN_PASSWORD_LENGTH &&
    password.length <= VALIDATION.MAX_PASSWORD_LENGTH
  );
};

// Storage utilities
export const saveToStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

// User utilities
export const getUserDisplayName = (user: User): string => {
  return user.name || 'Anonymous';
};

export const getUserInitials = (user: User): string => {
  const name = getUserDisplayName(user);
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Room utilities
export const getRoomDisplayName = (room: Room): string => {
  return room.name || 'Unnamed Room';
};

export const isRoomFull = (room: Room): boolean => {
  return room.maxParticipants ? room.participants.length >= room.maxParticipants : false;
};

// Error utilities
export const createAppError = (
  code: string,
  message: string,
  details?: any,
  module?: string
): AppError => {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    module: module as any,
  };
};

// Array utilities
export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Color utilities
export const generateAvatarColor = (seed: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

// Device utilities
export const isMobile = (): boolean => {
  return window.innerWidth <= 768;
};

export const isDesktop = (): boolean => {
  return window.innerWidth > 1024;
};
