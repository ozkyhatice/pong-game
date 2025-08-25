// API Configuration
export const API_CONFIG = {
  // BASE_URL: 'https://pong.com',
  // WS_URL: 'wss://pong.com/ws',

  BASE_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000/ws',

  ENDPOINTS: {
    AUTH: {
      // POST /api/auth/register
      // Body: { username, email, password }
      REGISTER: '/api/auth/register',

      // POST /api/auth/login
      // Body: { email, password }
      LOGIN: '/api/auth/login',

      // GET /api/auth/me
      // Headers: { Authorization: Bearer <token> }
      ME: '/api/auth/me',

      // GET /api/auth/google
      // OAuth login redirect (no fetch needed from frontend)
      GOOGLE: '/api/auth/google'
    },

    TWOFA: {
      // GET /api/2fa/setup
      // Headers: { Authorization: Bearer <token> }
      SETUP: '/api/2fa/setup',
      
      // PATCH /api/2fa/disable
      // Headers: { Authorization: Bearer <token> }
      DISABLE: '/api/2fa/disable',
      
      // POST /api/2fa/verify
      // Body: { token }
      // Headers: { Authorization: Bearer <token> }
      VERIFY: '/api/2fa/verify',
      
      // POST /api/2fa/verify-login
      // Body: { userId, token }
      VERIFY_LOGIN: '/api/2fa/verify-login'
    },

    USER: {
      // GET /api/users/me
      // Headers: { Authorization: Bearer <token> }
      ME: '/api/users/me',

      // PUT /api/users/me
      // Body: { username?, email?, avatar? }
      // Headers: { Authorization: Bearer <token> }
      UPDATE: '/api/users/me',

      // PUT /api/users/me/avatar
      // Body: FormData with avatar file
      // Headers: { Authorization: Bearer <token> }
      UPDATE_AVATAR: '/api/users/me/avatar',

      // GET /api/users/id/:id
      // Headers: { Authorization: Bearer <token> }
      BY_ID: (id: string) => `/api/users/id/${id}`,

      // GET /api/users/:username
      // Headers: { Authorization: Bearer <token> }
      BY_USERNAME: (username: string) => `/api/users/${username}`
    },

    FRIENDS: {
      // GET /api/friends
      LIST: '/api/friends',

      // POST /api/friends/add/:targetId
      ADD: (targetId: string) => `/api/friends/add/${targetId}`,

      // POST /api/friends/:targetId/accept
      ACCEPT: (targetId: string) => `/api/friends/${targetId}/accept`,

      // POST /api/friends/:targetId/reject
      REJECT: (targetId: string) => `/api/friends/${targetId}/reject`,

      // DELETE /api/friends/:targetId/remove
      REMOVE: (targetId: string) => `/api/friends/${targetId}/remove`,

      // POST /api/friends/:id/block
      BLOCK: (id: string) => `/api/friends/${id}/block`,

      // POST /api/friends/:id/unblock
      UNBLOCK: (id: string) => `/api/friends/${id}/unblock`,

      REQUESTS: {
        // GET /api/friends/requests/incoming
        INCOMING: '/api/friends/requests/incoming',

        // GET /api/friends/requests/sent
        SENT: '/api/friends/requests/sent'
      }
    },

    CHAT: {
      // GET /api/chat/history/:userId
      // Headers: { Authorization: Bearer <token> }
      HISTORY: (userId: string) => `/api/chat/history/${userId}`,

      // PUT /api/chat/mark-read/:userId
      // Headers: { Authorization: Bearer <token> }
      MARK_READ: (userId: string) => `/api/chat/mark-read/${userId}`
    }
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get WebSocket URL
export const getWsUrl = (): string => {
  return API_CONFIG.WS_URL;
};
