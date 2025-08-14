import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();
const TWO_FA_TOKEN_KEY = 'twofa_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const TOKEN_REFRESH_INTERVAL = 30000; // 30 seconds

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem(TWO_FA_TOKEN_KEY);
      if (token) {
        try {
          const response = await authAPI.verifyToken(token);
          if (response.data.user) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          // Only clear auth if token is invalid, not just expired
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem(TWO_FA_TOKEN_KEY);
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email, password });
      // Server returns { requiresOTP, email, type } for OTP flow
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.register(userData);
      // Server returns { requiresOTP, email }
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem(TWO_FA_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      setUser(null);
      setError(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const applyAuthSession = (token, authenticatedUser) => {
    if (token && authenticatedUser) {
      // Set token in both locations for compatibility
      localStorage.setItem('token', token);
      localStorage.setItem(TWO_FA_TOKEN_KEY, token);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    applyAuthSession,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};