import { WebSocketManager } from '../core/WebSocketManager.js';
import { UserInfo } from './UserService.js';

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
    this.initialize(); // Otomatik initialize
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
    
    // WebSocket bağlantısı kurulduğunda online users listesini iste
    this.wsManager.on('connected', () => {
      console.log('🔌 OnlineUsersService: WebSocket connected, requesting online users');
      this.requestOnlineUsers();
    });
    
    // Eğer zaten bağlıysa hemen iste
    if (this.wsManager.isConnected()) {
      this.requestOnlineUsers();
    }
  }

  private requestOnlineUsers(): void {
    // Backend'den online users listesini iste
    this.wsManager.send({
      type: 'getOnlineUsers'
    });
  }

  private setupWebSocketListeners(): void {
    console.log('🔌 OnlineUsersService: Setting up WebSocket listeners');
    
    this.wsManager.on('onlineClients', (data: any) => {
      console.log('📊 OnlineUsersService: Received online clients:', data);
      const clients = this.parseOnlineClientsData(data);
      this.updateOnlineUsers(clients);
    });

    this.wsManager.on('userStatus', (data: any) => {
      console.log('👤 OnlineUsersService: User status change:', data);
      const userId = data.userID || data.userId || data.id;
      const status = data.status;
      if (userId && status) {
        this.updateUserStatus(userId, status);
      }
    });

    // Kullanıcı online oldu
    this.wsManager.on('userOnline', (data: any) => {
      console.log('🟢 OnlineUsersService: User came online:', data);
      const userId = data.userID || data.userId || data.id;
      if (userId) {
        this.updateUserStatus(userId, 'online');
      }
    });

    // Kullanıcı offline oldu
    this.wsManager.on('userOffline', (data: any) => {
      console.log('🔴 OnlineUsersService: User went offline:', data);
      const userId = data.userID || data.userId || data.id;
      if (userId) {
        this.updateUserStatus(userId, 'offline');
      }
    });
  }

  private parseOnlineClientsData(data: any): OnlineUser[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  }

  private updateOnlineUsers(clients: OnlineUser[]): void {
    console.log('📊 OnlineUsersService: Updating online users list:', clients);
    
    // Mevcut offline kullanıcıları koru, sadece online olan kullanıcıları güncelle
    const currentUsers = new Map(this.onlineUsers);
    
    // Önce tüm mevcut kullanıcıları offline yap
    currentUsers.forEach((user, userId) => {
      user.status = 'offline';
      user.lastSeen = new Date();
    });
    
    // Sonra online olanları güncelle
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
    console.log(`👤 OnlineUsersService: Updating user ${userId} status to ${status}`);
    
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