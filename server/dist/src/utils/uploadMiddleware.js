"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_MIME_TYPES = exports.FILE_SIZE_LIMITS = exports.UPLOAD_DIRS = exports.UPLOAD_BASE_DIR = exports.uploadGenericAsset = exports.uploadCharacterAsset = exports.uploadMapAsset = void 0;
exports.ensureUploadDirs = ensureUploadDirs;
exports.getRelativePath = getRelativePath;
exports.getFileUrl = getFileUrl;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./logger");
// Upload directories
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';
exports.UPLOAD_BASE_DIR = UPLOAD_BASE_DIR;
const UPLOAD_DIRS = {
    maps: path_1.default.join(UPLOAD_BASE_DIR, 'maps'),
    characters: path_1.default.join(UPLOAD_BASE_DIR, 'characters'),
    assets: path_1.default.join(UPLOAD_BASE_DIR, 'assets'),
};
exports.UPLOAD_DIRS = UPLOAD_DIRS;
// Ensure upload directories exist
function ensureUploadDirs() {
    Object.values(UPLOAD_DIRS).forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            logger_1.logger.info(`Created upload directory: ${dir}`);
        }
    });
}
// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    default: 40 * 1024 * 1024, // 40MB
    image: 10 * 1024 * 1024, // 10MB for images
    texture: 25 * 1024 * 1024, // 25MB for character textures
};
exports.FILE_SIZE_LIMITS = FILE_SIZE_LIMITS;
// Allowed MIME types
const ALLOWED_MIME_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/json'],
};
exports.ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
// Custom storage configuration
const createStorage = (uploadType) => {
    return multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            // For map assets, create subdirectory per map
            if (uploadType === 'maps' && req.params.roomId) {
                const mapDir = path_1.default.join(UPLOAD_DIRS.maps, req.params.roomId);
                if (!fs_1.default.existsSync(mapDir)) {
                    fs_1.default.mkdirSync(mapDir, { recursive: true });
                }
                cb(null, mapDir);
            }
            // For character uploads, create subdirectory per user
            else if (uploadType === 'characters' && req.params.userId) {
                const userDir = path_1.default.join(UPLOAD_DIRS.characters, req.params.userId);
                if (!fs_1.default.existsSync(userDir)) {
                    fs_1.default.mkdirSync(userDir, { recursive: true });
                }
                cb(null, userDir);
            }
            else {
                cb(null, UPLOAD_DIRS[uploadType] || UPLOAD_DIRS.assets);
            }
        },
        filename: (req, file, cb) => {
            // Generate unique filename with original extension
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path_1.default.extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
        },
    });
};
// File filter factory
const createFileFilter = (allowedTypes) => {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`));
        }
    };
};
// Pre-configured upload middlewares
exports.uploadMapAsset = (0, multer_1.default)({
    storage: createStorage('maps'),
    limits: { fileSize: FILE_SIZE_LIMITS.image },
    fileFilter: createFileFilter(ALLOWED_MIME_TYPES.image),
});
exports.uploadCharacterAsset = (0, multer_1.default)({
    storage: createStorage('characters'),
    limits: { fileSize: FILE_SIZE_LIMITS.texture },
    fileFilter: createFileFilter(ALLOWED_MIME_TYPES.image),
});
exports.uploadGenericAsset = (0, multer_1.default)({
    storage: createStorage('assets'),
    limits: { fileSize: FILE_SIZE_LIMITS.default },
    fileFilter: createFileFilter(ALLOWED_MIME_TYPES.all),
});
// Helper to get relative path for database storage
function getRelativePath(absolutePath) {
    return absolutePath.replace(UPLOAD_BASE_DIR, '').replace(/^\//, '');
}
// Helper to get full URL for file serving
function getFileUrl(relativePath) {
    const baseUrl = process.env.SERVER_URL || 'http://localhost:3001';
    return `${baseUrl}/uploads/${relativePath}`;
}
