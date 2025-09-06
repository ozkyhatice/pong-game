import { WebSocketManager } from '../core/WebSocketManager.js';
import { UserInfo } from './UserService.js';
import { XSSProtection } from '../core/XSSProtection.js';

export interface OnlineUser extends UserInfo {
  status: 'online' | 'offline';
  lastSeen?: Date;
}

export class OnlineUsersService {
  private static instance: OnlineUsersService;
  private onlineUsers: Map<number, OnlineUser> = new Map();
  private listeners: Array<(users: OnlineUser[]) => void> = [];
  private wsManager: WebSocketManager;
  private isInitialized = false;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.initialize();
  }

  static getInstance(): OnlineUsersService {
    if (!OnlineUsersService.instance) {
      OnlineUsersService.instance = new OnlineUsersService();
    }
    return OnlineUsersService.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    this.setupWebSocketListeners();
    this.isInitialized = true;
    
    this.wsManager.on('connected', () => {
      this.requestOnlineUsers();
    });
    
    if (this.wsManager.isConnected()) {
      this.requestOnlineUsers();
    }
  }

  private requestOnlineUsers(): void {
    this.wsManager.send({
      type: 'getOnlineUsers'
    });
  }

  private setupWebSocketListeners(): void {
    
    this.wsManager.on('onlineClients', (data: any) => {
      const clients = this.parseOnlineClientsData(data);
      this.updateOnlineUsers(clients);
    });

    this.wsManager.on('userStatus', (data: any) => {
      const userId = data.userID || data.userId || data.id;
      const status = data.status;
      if (userId && status) {
        this.updateUserStatus(userId, status);
      }
    });

    this.wsManager.on('userOnline', (data: any) => {
      const userId = data.userID || data.userId || data.id;
      if (userId) {
        this.updateUserStatus(userId, 'online');
      }
    });

    this.wsManager.on('userOffline', (data: any) => {
      const userId = data.userID || data.userId || data.id;
      if (userId) {
        this.updateUserStatus(userId, 'offline');
      }
    });
  }

  private parseOnlineClientsData(data: any): OnlineUser[] {
    let clients = [];
    
    if (Array.isArray(data)) {
      clients = data;
    } else if (data && Array.isArray(data.data)) {
      clients = data.data;
    } else {
      return [];
    }
    
    // Sanitize user data
    return clients.map((client: any) => XSSProtection.sanitizeJSON(client));
  }

  private updateOnlineUsers(clients: OnlineUser[]): void {
    const currentUsers = new Map(this.onlineUsers);
    
    currentUsers.forEach((user, userId) => {
      user.status = 'offline';
      user.lastSeen = new Date();
    });
    
    clients.forEach(client => {
      currentUsers.set(client.id, {
        ...client,
        status: 'online',
        lastSeen: new Date()
      });
    });
    
    this.onlineUsers = currentUsers;
    this.notifyListeners();
  }

  private updateUserStatus(userId: number, status: 'online' | 'offline'): void {
    const currentTime = new Date();
    if (status === 'online') {
      this.setUserOnline(userId, currentTime);
    } else {
      this.setUserOffline(userId, currentTime);
    }
    this.notifyListeners();
  }

  private setUserOnline(userId: number, timestamp: Date): void {
    if (!this.onlineUsers.has(userId)) {
      this.onlineUsers.set(userId, {
        id: userId,
        username: `User${userId}`,
        status: 'online',
        lastSeen: timestamp
      });
    } else {
      const user = this.onlineUsers.get(userId)!;
      user.status = 'online';
      user.lastSeen = timestamp;
    }
  }

  private setUserOffline(userId: number, timestamp: Date): void {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.status = 'offline';
      user.lastSeen = timestamp;
    }
  }

  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values()).filter(user => user.status === 'online');
  }

  getAllUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  getUserStatus(userId: number): OnlineUser | null {
    return this.onlineUsers.get(userId) || null;
  }

  isUserOnline(userId: number): boolean {
    const user = this.onlineUsers.get(userId);
    return user ? user.status === 'online' : false;
  }

  onStatusChange(callback: (users: OnlineUser[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getAllUsers());
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(): void {
    const users = this.getAllUsers();
    this.listeners.forEach(callback => callback(users));
  }

  destroy(): void {
    this.onlineUsers.clear();
    this.listeners.length = 0;
    this.isInitialized = false;
    this.wsManager.off('onlineClients');
    this.wsManager.off('userStatus');
  }
}