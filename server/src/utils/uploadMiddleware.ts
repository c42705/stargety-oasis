import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logger } from './logger';

// Upload directories
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';
const UPLOAD_DIRS = {
  maps: path.join(UPLOAD_BASE_DIR, 'maps'),
  characters: path.join(UPLOAD_BASE_DIR, 'characters'),
  assets: path.join(UPLOAD_BASE_DIR, 'assets'),
} as const;

// Ensure upload directories exist
export function ensureUploadDirs(): void {
  Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created upload directory: ${dir}`);
    }
  });
}

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  default: 40 * 1024 * 1024,  // 40MB
  image: 10 * 1024 * 1024,    // 10MB for images
  texture: 25 * 1024 * 1024,  // 25MB for character textures
} as const;

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/json'],
} as const;

// Custom storage configuration
const createStorage = (uploadType: keyof typeof UPLOAD_DIRS) => {
  return multer.diskStorage({
    destination: (req: Request, file, cb) => {
      // For map assets, create subdirectory per map
      if (uploadType === 'maps' && req.params.roomId) {
        const mapDir = path.join(UPLOAD_DIRS.maps, req.params.roomId);
        if (!fs.existsSync(mapDir)) {
          fs.mkdirSync(mapDir, { recursive: true });
        }
        cb(null, mapDir);
      } 
      // For character uploads, create subdirectory per user
      else if (uploadType === 'characters' && req.params.userId) {
        const userDir = path.join(UPLOAD_DIRS.characters, req.params.userId);
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
      } else {
        cb(null, UPLOAD_DIRS[uploadType] || UPLOAD_DIRS.assets);
      }
    },
    filename: (req: Request, file, cb) => {
      // Generate unique filename with original extension
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
};

// File filter factory
const createFileFilter = (allowedTypes: readonly string[]) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`));
    }
  };
};

// Pre-configured upload middlewares
export const uploadMapAsset = multer({
  storage: createStorage('maps'),
  limits: { fileSize: FILE_SIZE_LIMITS.image },
  fileFilter: createFileFilter(ALLOWED_MIME_TYPES.image),
});

export const uploadCharacterAsset = multer({
  storage: createStorage('characters'),
  limits: { fileSize: FILE_SIZE_LIMITS.texture },
  fileFilter: createFileFilter(ALLOWED_MIME_TYPES.image),
});

export const uploadGenericAsset = multer({
  storage: createStorage('assets'),
  limits: { fileSize: FILE_SIZE_LIMITS.default },
  fileFilter: createFileFilter(ALLOWED_MIME_TYPES.all),
});

// Helper to get relative path for database storage
export function getRelativePath(absolutePath: string): string {
  return absolutePath.replace(UPLOAD_BASE_DIR, '').replace(/^\//, '');
}

// Helper to get full URL for file serving
export function getFileUrl(relativePath: string): string {
  const baseUrl = process.env.SERVER_URL || 'http://localhost:3001';
  return `${baseUrl}/uploads/${relativePath}`;
}

// Export constants
export { UPLOAD_BASE_DIR, UPLOAD_DIRS, FILE_SIZE_LIMITS, ALLOWED_MIME_TYPES };

