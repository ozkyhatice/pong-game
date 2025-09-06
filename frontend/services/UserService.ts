import { API_CONFIG, getApiUrl } from '../config.js';
import { XSSProtection } from '../core/XSSProtection.js';

export interface UserInfo {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  wins?: number;
  losses?: number;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  avatar?: string;
}

export class UserService {
  private cache = new Map<number, UserInfo>();
  private currentUserCache: UserInfo | null = null;
  private currentUserCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async getCurrentUser(): Promise<UserInfo | null> {
    if (this.currentUserCache && 
        Date.now() - this.currentUserCacheTime < this.CACHE_DURATION) {
      return this.currentUserCache;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.ME), {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) return null;

      const data = await response.json();
      const user: UserInfo = XSSProtection.sanitizeJSON(data.user || data);
      
      this.currentUserCache = user;
      this.currentUserCacheTime = Date.now();
      this.cache.set(user.id, user);
      
      return user;
    } catch {
      return null;
    }
  }

  async getUserById(userId: number): Promise<UserInfo | null> {
    if (this.cache.has(userId)) {
      return this.cache.get(userId)!;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_ID(userId.toString())), {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) return null;

      const data = await response.json();
      const user: UserInfo = XSSProtection.sanitizeJSON(data.user || data);
      this.cache.set(userId, user);
      return user;
    } catch {
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<UserInfo | null> {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.BY_USERNAME(username)), {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) return null;

      const data = await response.json();
      const user: UserInfo = XSSProtection.sanitizeJSON(data.user || data);
      this.cache.set(user.id, user);
      return user;
    } catch {
      return null;
    }
  }

  async updateProfile(data: UpdateUserData): Promise<UserInfo | null> {
    try {
      // Sanitize input data before sending
      const sanitizedData = {
        username: data.username ? XSSProtection.cleanInput(data.username, 50) : undefined,
        email: data.email ? XSSProtection.cleanInput(data.email, 100) : undefined,
        avatar: data.avatar ? XSSProtection.cleanInput(data.avatar, 500) : undefined
      };

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.UPDATE), {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedData)
      });

      if (!response.ok) return null;

      const responseData = await response.json();
      const user: UserInfo = XSSProtection.sanitizeJSON(responseData.user || responseData);
      
      this.currentUserCache = null;
      this.currentUserCacheTime = 0;
      this.cache.set(user.id, user);
      
      return user;
    } catch {
      return null;
    }
  }

  async updateAvatar(avatarFile: File): Promise<UserInfo | null> {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USER.UPDATE_AVATAR), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: formData
      });

      if (!response.ok) return null;

      const data = await response.json();
      const user: UserInfo = data.user || data;

      this.currentUserCache = null;
      this.currentUserCacheTime = 0;
      this.cache.set(user.id, user);
      
      return user;
    } catch {
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.currentUserCache = null;
    this.currentUserCacheTime = 0;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}