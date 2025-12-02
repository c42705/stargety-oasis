/**
 * API Client - Base utilities for API calls
 * 
 * Separated from index.ts to avoid circular dependencies.
 */

import { API_CONFIG } from '../../shared/constants';
import { logger } from '../../shared/logger';

// Base API response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// API client configuration
export const apiConfig = {
  baseUrl: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
};

/**
 * Generic fetch wrapper with error handling and timeout
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error(`API error: ${endpoint}`, { status: response.status, data });
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    
    return data as ApiResponse<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`API timeout: ${endpoint}`);
      return { success: false, error: 'Request timeout' };
    }
    
    logger.error(`API fetch failed: ${endpoint}`, error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Upload file to API endpoint
 */
export async function apiUpload<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>> {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error(`Upload error: ${endpoint}`, { status: response.status, data });
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }
    
    return data as ApiResponse<T>;
  } catch (error) {
    logger.error(`Upload failed: ${endpoint}`, error);
    return { success: false, error: 'Upload failed' };
  }
}

