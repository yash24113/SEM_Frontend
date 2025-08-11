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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  verifyToken: () => api.get('/api/auth/verify'),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/api/auth/reset-password', { token, newPassword }),
  verifyOtp: (data) => api.post('/api/auth/verify-otp', data),
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

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/api/profile'),
  updateProfile: (profileData) => api.put('/api/profile', profileData),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/api/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  changePassword: (currentPassword, newPassword) => 
    api.put('/api/profile/password', { currentPassword, newPassword }),
  deleteAccount: () => api.delete('/api/profile'),
  getAvatar: (filename) => `${API_BASE_URL}/api/profile/avatar/${filename}`,
};

export default api;
