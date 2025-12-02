"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.SimpleDatabase = exports.SimpleStorage = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Simple file-based storage utility
class SimpleStorage {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.ensureDataDirectory();
    }
    ensureDataDirectory() {
        if (!fs_1.default.existsSync(this.dataDir)) {
            fs_1.default.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    getFilePath(collection) {
        return path_1.default.join(this.dataDir, `${collection}.json`);
    }
    // Save data to a collection
    async save(collection, data) {
        try {
            const filePath = this.getFilePath(collection);
            await fs_1.default.promises.writeFile(filePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error(`Error saving to ${collection}:`, error);
            throw error;
        }
    }
    // Load data from a collection
    async load(collection) {
        try {
            const filePath = this.getFilePath(collection);
            if (!fs_1.default.existsSync(filePath)) {
                return [];
            }
            const data = await fs_1.default.promises.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error(`Error loading from ${collection}:`, error);
            return [];
        }
    }
    // Add item to collection
    async add(collection, item) {
        const items = await this.load(collection);
        items.push(item);
        await this.save(collection, items);
    }
    // Update item in collection
    async update(collection, id, updates) {
        const items = await this.load(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }
        items[index] = { ...items[index], ...updates };
        await this.save(collection, items);
        return true;
    }
    // Find item by id
    async findById(collection, id) {
        const items = await this.load(collection);
        return items.find(item => item.id === id) || null;
    }
    // Find items by criteria
    async find(collection, predicate) {
        const items = await this.load(collection);
        return items.filter(predicate);
    }
}
exports.SimpleStorage = SimpleStorage;
// Simple implementation using file storage
class SimpleDatabase {
    constructor(dataDir) {
        this.storage = new SimpleStorage(dataDir);
    }
    async saveUser(user) {
        await this.storage.add('users', user);
    }
    async getUser(id) {
        return await this.storage.findById('users', id);
    }
    async saveMessage(message) {
        await this.storage.add('messages', message);
    }
    async getMessages(roomId, limit = 50) {
        const messages = await this.storage.find('messages', (msg) => msg.roomId === roomId);
        return messages.slice(-limit);
    }
    async saveRoom(room) {
        await this.storage.add('rooms', room);
    }
    async getRoom(id) {
        return await this.storage.findById('rooms', id);
    }
}
exports.SimpleDatabase = SimpleDatabase;
// Export singleton instance
exports.database = new SimpleDatabase();
