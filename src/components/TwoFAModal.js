import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, CircularProgress } from '@mui/material';

const TwoFAModal = ({ open, onClose, onVerify, email }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      // Call backend to verify 2FA code (implement this in AuthContext/login)
      const result = await onVerify(code);
      if (!result?.success) {
        setError('Invalid code.');
      }
    } catch (err) {
      setError('Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Two-Factor Authentication</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Enter the 6-digit code from your Authenticator App for <b>{email}</b>.
        </Typography>
        <TextField
          label="Authentication Code"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          fullWidth
          inputProps={{ maxLength: 6 }}
          autoFocus
        />
        {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleVerify} variant="contained" disabled={loading || code.length !== 6}>
          {loading ? <CircularProgress size={20} /> : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TwoFAModal;
