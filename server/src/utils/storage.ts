import fs from 'fs';
import path from 'path';

// Simple file-based storage utility
export class SimpleStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.ensureDataDirectory();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(collection: string): string {
    return path.join(this.dataDir, `${collection}.json`);
  }

  // Save data to a collection
  async save<T>(collection: string, data: T[]): Promise<void> {
    try {
      const filePath = this.getFilePath(collection);
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving to ${collection}:`, error);
      throw error;
    }
  }

  // Load data from a collection
  async load<T>(collection: string): Promise<T[]> {
    try {
      const filePath = this.getFilePath(collection);

      if (!fs.existsSync(filePath)) {
        return [];
      }

      const data = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading from ${collection}:`, error);
      return [];
    }
  }

  // Add item to collection
  async add<T extends { id: string }>(collection: string, item: T): Promise<void> {
    const items = await this.load<T>(collection);
    items.push(item);
    await this.save(collection, items);
  }

  // Update item in collection
  async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<boolean> {
    const items = await this.load<T>(collection);
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    items[index] = { ...items[index], ...updates };
    await this.save(collection, items);
    return true;
  }

  // Find item by id
  async findById<T extends { id: string }>(collection: string, id: string): Promise<T | null> {
    const items = await this.load<T>(collection);
    return items.find(item => item.id === id) || null;
  }

  // Find items by criteria
  async find<T>(collection: string, predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.load<T>(collection);
    return items.filter(predicate);
  }
}

// Database interface for future migration
export interface DatabaseInterface {
  saveUser(user: any): Promise<void>;
  getUser(id: string): Promise<any | null>;
  saveMessage(message: any): Promise<void>;
  getMessages(roomId: string, limit?: number): Promise<any[]>;
  saveRoom(room: any): Promise<void>;
  getRoom(id: string): Promise<any | null>;
}

// Simple implementation using file storage
export class SimpleDatabase implements DatabaseInterface {
  private storage: SimpleStorage;

  constructor(dataDir?: string) {
    this.storage = new SimpleStorage(dataDir);
  }

  async saveUser(user: any): Promise<void> {
    await this.storage.add('users', user);
  }

  async getUser(id: string): Promise<any | null> {
    return await this.storage.findById('users', id);
  }

  async saveMessage(message: any): Promise<void> {
    await this.storage.add('messages', message);
  }

  async getMessages(roomId: string, limit: number = 50): Promise<any[]> {
    const messages = await this.storage.find('messages', (msg: any) => msg.roomId === roomId);
    return messages.slice(-limit);
  }

  async saveRoom(room: any): Promise<void> {
    await this.storage.add('rooms', room);
  }

  async getRoom(id: string): Promise<any | null> {
    return await this.storage.findById('rooms', id);
  }
}

// Export singleton instance
export const database = new SimpleDatabase();
