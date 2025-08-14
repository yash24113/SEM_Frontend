import React, { useState, useContext } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';

function OtpVerify({ email, mode = '2fa', onVerified }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { applyAuthSession } = useContext(AuthContext);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      let response;
      
      if (mode === '2fa') {
        // Handle 2FA verification
        response = await authAPI.verify2FACode({ email, code: otp });
      } else {
        // Handle regular OTP verification
        response = await authAPI.verifyOtp({ email, otp });
      }
      
      // Save token and user data
      const { token, user } = response.data;
      applyAuthSession(token, user);
      
      // Call the onVerified callback if provided
      if (onVerified) {
        onVerified();
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f4f6f8"
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" gutterBottom align="center">
          {mode === '2fa' ? 'Two-Factor Authentication' : 'Verify OTP'}
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 3, color: 'text.secondary' }}>
          {mode === '2fa' 
            ? 'Enter the code from your authenticator app' 
            : 'Enter the OTP sent to your email'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          fullWidth
          margin="normal"
          required
          autoFocus
          inputMode="numeric"
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleVerify}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify OTP'}
        </Button>

        <Button
          variant="text"
          fullWidth
          onClick={() => navigate(-1)}
          sx={{ mt: 1 }}
        >
          Go Back
        </Button>
      </Paper>
    </Box>
  );
}

export default OtpVerify;
