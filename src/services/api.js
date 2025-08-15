import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Skip token check for auth-related endpoints
    if (config.url.includes('/auth/')) {
      return config;
    }
    
    // Check for token in both 'token' and 'twofa_token' storage
    const token = localStorage.getItem('token') || localStorage.getItem('twofa_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!window.location.pathname.includes('/login')) {
      // Only redirect if not already on login page
      window.location.href = '/login';
      return Promise.reject(new Error('No authentication token found'));
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Don't redirect for login/2fa verification requests
      if (originalRequest?.url?.includes('/auth/login') || 
          originalRequest?.url?.includes('/2fa/verify-login')) {
        return Promise.reject(error);
      }
      
      // Clear auth data only on 401 unauthorized
      if (error.response?.data?.message === 'Unauthorized') {
        localStorage.removeItem('token');
        localStorage.removeItem('twofa_token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  getCurrentUser: () => api.get('/api/auth/me'),
  verifyToken: (token) => api.get('/api/auth/verify', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  }),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/api/auth/reset-password', { token, newPassword }),
  verifyOtp: (data) => api.post('/api/auth/verify-otp', data),
  verify2FACode: (data) => api.post('/api/auth/2fa/verify-login', data),
  resendOtp: (data) => api.post('/api/auth/resend-otp', data),
};

// Environment API
export const environmentAPI = {
  getLatestData: () => api.get('/api/environment/latest'),
  getData: (page = 1, limit = 50) => api.get(`/api/environment?page=${page}&limit=${limit}`),
  getDataByRange: (startDate, endDate, deviceId) => 
    api.get(`/api/environment/range?startDate=${startDate}&endDate=${endDate}${deviceId ? `&deviceId=${deviceId}` : ''}`),
  addData: (data) => api.post('/api/environment', data),
  getStats: (period = '24h') => api.get(`/api/environment/stats?period=${period}`),
};

// System Metrics API
export const systemAPI = {
  postMetrics: (payload) => api.post('/api/system/metrics', payload),
  getLatest: () => api.get('/api/system/latest'),
  getRange: (startDate, endDate, deviceId) => api.get(`/api/system/range?startDate=${startDate}&endDate=${endDate}${deviceId ? `&deviceId=${deviceId}` : ''}`),
  getDevices: () => api.get('/api/system/devices'),
  sendCommand: (deviceId, command) => api.post('/api/system/command', { deviceId, command }),
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/api/profile'),
  updateProfile: (profileData) => api.put('/api/profile', profileData),
  uploadAvatar: (file, twoFACode) => {
    const formData = new FormData();
    formData.append('avatar', file);
    if (twoFACode) {
      formData.append('twoFACode', twoFACode);
    }
    return api.post('/api/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  changePassword: (currentPassword, newPassword, twoFACode) => 
    api.put('/api/profile/password', { currentPassword, newPassword, twoFACode }),
  deleteAccount: () => api.delete('/api/profile'),
  getAvatar: (filename) => `${API_BASE_URL}/api/profile/avatar/${filename}`,
};

// 2FA API
export const twoFAAPI = {
  setup: () => api.post('/api/2fa/setup'),
  verify: (code, secret) => api.post('/2fa/verify', { code, secret }),
  enable: (secret) => api.post('/2fa/enable', { secret }),
  disable: () => api.post('/2fa/disable'),
};

// Alert API
export const alertAPI = {
  sendAlert: (message) => api.post('/api/alerts/send', { message }),
};

export default api;
