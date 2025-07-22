// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      GOOGLE: '/auth/google'
    },
    USER: '/user',
    FRIENDS: '/friends'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
