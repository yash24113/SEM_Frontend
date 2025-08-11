import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { authAPI } from '../services/api';

const OtpModal = ({ open, onClose, email, onVerify, type }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleVerify = async () => {
    const sanitized = (otp || '').replace(/\D/g, '').slice(0, 4);
    if (!sanitized || sanitized.length !== 4) {
      setError('Enter 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOtp({
        email,
        otp: sanitized,
        type // 'register' or 'login'
      });

      onVerify(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await authAPI.resendOtp({
        email,
        type
      });
      setResendDisabled(true);
      let timeLeft = 30;
      setCountdown(timeLeft);
      
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft === 0) {
          clearInterval(timer);
          setResendDisabled(false);
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? null : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Enter Verification Code
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={loading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Please enter the verification code sent to {email}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Verification Code"
            fullWidth
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            disabled={loading}
            sx={{ mt: 2 }}
            type="tel"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4 }}
            onKeyDown={(e) => {
              const allowed = [
                'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'
              ];
              if (allowed.includes(e.key)) return;
              if (!/^[0-9]$/.test(e.key)) {
                e.preventDefault();
              }
            }}
          />
          {resendDisabled && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Resend available in {countdown} seconds
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleResendOtp}
          disabled={loading || resendDisabled}
          color="inherit"
        >
          Resend Code
        </Button>
        <Button
          onClick={handleVerify}
          disabled={loading}
          variant="contained"
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          Verify
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OtpModal;
