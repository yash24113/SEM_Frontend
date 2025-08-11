import React, { useState } from 'react';
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
import axios from 'axios';

const BACKEND_API = process.env.REACT_APP_ATTENDANCE_BACKEND_API;

function OtpVerify({ email, mode, onVerified }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_API}/api/auth/verify-otp`, {
        email,
        otp,
      });
      onVerified();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
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
          Verify OTP
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 3, color: 'text.secondary' }}>
          Enter the OTP sent to your email
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
