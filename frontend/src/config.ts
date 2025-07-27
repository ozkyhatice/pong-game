// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',

  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      // GOOGLE: '/auth/google'  -> soon
    },
    USER: {
      ME: '/users/me'
    },
    FRIENDS: {
      LIST: '/friends',
      ADD: (targetId: string) => `/friends/add/${targetId}`,
      ACCEPT: (targetId: string) => `/friends/${targetId}/accept`,
      REJECT: (targetId: string) => `/friends/${targetId}/reject`,
      BLOCK: (targetId: string) => `/friends/${targetId}/block`,
      UNBLOCK: (targetId: string) => `/friends/${targetId}/unblock`,
      REQUESTS: {
        INCOMING: '/friends/requests/incoming',
        SENT: '/friends/requests/send'
      }
    }
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};