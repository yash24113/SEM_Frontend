import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OtpModal from '../components/OtpModal';
import TwoFAModal from '../components/TwoFAModal';
import api, { authAPI } from '../services/api';

const TWO_FA_TOKEN_KEY = 'twofa_token';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showTwoFAModal, setShowTwoFAModal] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [otpType, setOtpType] = useState('login');

  const { login, error, clearError, applyAuthSession, logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      let token = localStorage.getItem('token');
      if (!token) {
        token = localStorage.getItem('twofa_token');
      }
      if (token) {
        try {
          const response = await api.verifyToken(token);
          if (response.data.user) {
            applyAuthSession(token, response.data.user);
            navigate('/dashboard');
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('twofa_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [applyAuthSession, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result?.requires2FA && result?.user?.profile?.twoFAEnabled) {
        setTempEmail(formData.email);
        setShowTwoFAModal(true);
      } else if (result?.requiresOTP) {
        setTempEmail(formData.email);
        setOtpType(result?.type || 'login');
        setShowOtpModal(true);
      } else if (result?.token && result?.user) {
        applyAuthSession(result.token, result.user);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFAVerify = async (code) => {
    try {
      // Use correct API endpoint
      const res = await authAPI.verify2FACode({ email: tempEmail, code });
      const data = res.data;
      if (data.token && data.user) {
        applyAuthSession(data.token, data.user);
        // Store 2FA session token in localStorage
        localStorage.setItem(TWO_FA_TOKEN_KEY, data.token);
        setShowTwoFAModal(false);
        navigate('/dashboard');
        return { success: true };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false };
    }
  };

  const handleOtpVerify = (result) => {
    setShowOtpModal(false);
    if (result?.token && result?.user) {
      applyAuthSession(result.token, result.user);
      navigate('/dashboard');
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // In useEffect for logout/redirect in Profile.js, check for 2FA token and clear it on logout
  useEffect(() => {
    if (user && user.profile && user.profile.twoFAEnabled) {
      // Remove 2FA token and logout
      localStorage.removeItem(TWO_FA_TOKEN_KEY);
      logout();
      navigate('/login');
    }
  }, [user, logout, navigate]);

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
            border: '4px solid',
            borderImage: 'linear-gradient(270deg, #ff6ec4, #7873f5, #42e695, #ff6ec4) 1',
            animation: 'borderAnimation 6s linear infinite',
            '@keyframes borderAnimation': {
              '0%': { borderImageSource: 'linear-gradient(270deg, #ff6ec4, #7873f5, #42e695, #ff6ec4)' },
              '100%': { borderImageSource: 'linear-gradient(270deg, #42e695, #ff6ec4, #7873f5, #42e695)' },
            },
          }}
        >
          <img src="/logo.jpg" alt="Logo" style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to your Smart Environment Monitor account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>

      <OtpModal
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        email={tempEmail}
        onVerify={handleOtpVerify}
        type={otpType}
      />
      <TwoFAModal
        open={showTwoFAModal}
        onClose={() => setShowTwoFAModal(false)}
        onVerify={handleTwoFAVerify}
        email={tempEmail}
      />
    </Container>
  );
};

export default Login;