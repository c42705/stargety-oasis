/**
 * Asset API Service
 * 
 * Provides API methods for generic file uploads and asset management.
 * Used for standalone asset uploads not tied to specific maps or characters.
 */

import { apiUpload, ApiResponse } from './apiClient';

// Generic uploaded asset
export interface UploadedAsset {
  id: string;
  filename: string;
  originalname: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

// Asset info for display
export interface AssetInfo {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt?: string;
}

/**
 * Asset API Service - handles generic file uploads
 */
export const AssetApiService = {
  /**
   * Upload a generic file
   */
  async uploadFile(file: File): Promise<ApiResponse<UploadedAsset>> {
    return apiUpload<UploadedAsset>('/api/uploads', file);
  },

  /**
   * Get asset URL from path
   * Utility to convert relative paths to full URLs
   */
  getAssetUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    // Remove leading slash if present and prepend API base
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${cleanPath}`;
  },

  /**
   * Convert file to base64 data URL (client-side utility)
   * Useful for preview before upload
   */
  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Validate file type
   */
  isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  },

  /**
   * Validate file size (default 40MB limit)
   */
  isValidFileSize(file: File, maxSizeMB: number = 40): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  },

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get image dimensions from file (client-side utility)
   */
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  },
};

// Default export for convenience
export default AssetApiService;

