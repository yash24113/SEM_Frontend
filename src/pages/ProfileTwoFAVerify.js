import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { profileAPI } from '../services/api';

export default function ProfileTwoFAVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const { mode, updateData, currentPassword, newPassword, hasAvatar } = state;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'profile') {
        const response = await profileAPI.updateProfile({ ...updateData, twoFACode: code });
        if (hasAvatar && state.avatarFile) {
          await profileAPI.uploadAvatar(state.avatarFile, code);
        }
      } else if (mode === 'password') {
        await profileAPI.changePassword(currentPassword, newPassword, code);
      }
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    navigate('/profile', { replace: true });
    return null;
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" gutterBottom>
          Two-Factor Authentication
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the 6-digit verification code from your authenticator app to continue.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Verification Code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          fullWidth
          inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
        />
        <Button onClick={handleSubmit} variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading || code.length !== 6}>
          {loading ? <CircularProgress size={20} /> : 'Verify'}
        </Button>
        <Button onClick={() => navigate('/profile')} fullWidth sx={{ mt: 1 }} disabled={loading}>
          Cancel
        </Button>
      </Paper>
    </Box>
  );
}


