/**
 * API Services - Centralized API client layer
 *
 * This module provides type-safe API clients for communicating with the backend.
 * Each service handles a specific domain (maps, characters, settings, etc.)
 *
 * Features:
 * - Consistent error handling
 * - Type-safe request/response interfaces
 * - Fallback to localStorage when offline
 * - Request caching where appropriate
 */

// Re-export base utilities from apiClient
export { apiFetch, apiUpload, apiConfig, type ApiResponse } from './apiClient';

// Re-export all services
export * from './MapApiService';
export * from './CharacterApiService';
export * from './SettingsApiService';
export * from './AssetApiService';

