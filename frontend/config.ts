// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000/ws',

  ENDPOINTS: {
    AUTH: {
      // POST /auth/register
      // Body: { username, email, password }
      REGISTER: '/auth/register',

      // POST /auth/login
      // Body: { email, password }
      LOGIN: '/auth/login',

      // GET /auth/me
      // Headers: { Authorization: Bearer <token> }
      ME: '/auth/me',

      // GET /auth/google
      // OAuth login redirect (no fetch needed from frontend)
      GOOGLE: '/auth/google'
    },

    TWOFA: {
      // GET /2fa/setup
      // Headers: { Authorization: Bearer <token> }
      SETUP: '/2fa/setup',
      
      // PATCH /2fa/disable
      // Headers: { Authorization: Bearer <token> }
      DISABLE: '/2fa/disable',
      
      // POST /2fa/verify
      // Body: { token }
      // Headers: { Authorization: Bearer <token> }
      VERIFY: '/2fa/verify',
      
      // POST /2fa/verify-login
      // Body: { userId, token }
      VERIFY_LOGIN: '/2fa/verify-login'
    },

    USER: {
      // GET /users/me
      // Headers: { Authorization: Bearer <token> }
      ME: '/users/me',

      // PUT /users/me
      // Body: { username?, email?, avatar? }
      // Headers: { Authorization: Bearer <token> }
      UPDATE: '/users/me',

      // PUT /users/me/avatar
      // Body: FormData with avatar file
      // Headers: { Authorization: Bearer <token> }
      UPDATE_AVATAR: '/users/me/avatar',

      // GET /users/id/:id
      // Headers: { Authorization: Bearer <token> }
      BY_ID: (id: string) => `/users/id/${id}`,

      // GET /users/:username
      // Headers: { Authorization: Bearer <token> }
      BY_USERNAME: (username: string) => `/users/${username}`
    },

    FRIENDS: {
      // GET /friends
      LIST: '/friends',

      // POST /friends/add/:targetId
      ADD: (targetId: string) => `/friends/add/${targetId}`,

      // POST /friends/:targetId/accept
      ACCEPT: (targetId: string) => `/friends/${targetId}/accept`,

      // POST /friends/:targetId/reject
      REJECT: (targetId: string) => `/friends/${targetId}/reject`,

      // DELETE /friends/:targetId/remove
      REMOVE: (targetId: string) => `/friends/${targetId}/remove`,

      // POST /friends/:id/block
      BLOCK: (id: string) => `/friends/${id}/block`,

      // POST /friends/:id/unblock
      UNBLOCK: (id: string) => `/friends/${id}/unblock`,

      REQUESTS: {
        // GET /friends/requests/incoming
        INCOMING: '/friends/requests/incoming',

        // GET /friends/requests/sent
        SENT: '/friends/requests/sent'
      }
    },

    CHAT: {
      // GET /chat/history/:userId
      // Headers: { Authorization: Bearer <token> }
      HISTORY: (userId: string) => `/chat/history/${userId}`,

      // PUT /chat/mark-read/:userId
      // Headers: { Authorization: Bearer <token> }
      MARK_READ: (userId: string) => `/chat/mark-read/${userId}`
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
