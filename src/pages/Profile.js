import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  InputAdornment,
  MenuItem
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Phone,
  LocationOn,
  Settings,
  Delete,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    temperatureUnit: 'celsius',
    notifications: true
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      const userProfile = response.data;
      setProfile(userProfile);
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        bio: userProfile.profile?.bio || '',
        location: userProfile.profile?.location || '',
        temperatureUnit: userProfile.profile?.preferences?.temperatureUnit || 'celsius',
        notifications: userProfile.profile?.preferences?.notifications !== false
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Upload avatar if changed
      if (avatarFile) {
        await profileAPI.uploadAvatar(avatarFile);
      }
      
      // Update profile
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        profile: {
          bio: formData.bio,
          location: formData.location,
          preferences: {
            temperatureUnit: formData.temperatureUnit,
            notifications: formData.notifications
          }
        }
      };
      
      const response = await profileAPI.updateProfile(updateData);
      setProfile(response.data);
      updateUser(response.data);
      
      setEditMode(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSuccess('Profile updated successfully');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    fetchProfile(); // Reset to original data
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      await profileAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      setPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setSuccess('Password changed successfully');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setSaving(true);
      await profileAPI.deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
      setSaving(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (profile?.profile?.avatar) {
      return profileAPI.getAvatar(profile.profile.avatar.split('/').pop());
    }
    return null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/dashboard')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">Profile Settings</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box position="relative" display="inline-block">
              <Avatar
                src={getAvatarUrl()}
                sx={{ width: 120, height: 120, mb: 2 }}
              />
              {editMode && (
                <IconButton
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'background.paper'
                  }}
                >
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <PhotoCamera />
                </IconButton>
              )}
            </Box>
            
            <Typography variant="h5" gutterBottom>
              {profile?.name}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {profile?.email}
            </Typography>
            
            {profile?.profile?.bio && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                {profile.profile.bio}
              </Typography>
            )}
            
            {profile?.profile?.location && (
              <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="body2" color="textSecondary">
                  {profile.profile.location}
                </Typography>
              </Box>
            )}
            
            <Box mt={2}>
              <Chip
                label={`Temperature: ${profile?.profile?.preferences?.temperatureUnit || 'celsius'}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </Paper>
        </Grid>

        {/* Profile Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Personal Information</Typography>
              {!editMode ? (
                <Button
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                  variant="outlined"
                >
                  Edit Profile
                </Button>
              ) : (
                <Box display="flex" gap={1}>
                  <Button
                    startIcon={<Save />}
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                  >
                    {saving ? <CircularProgress size={20} /> : 'Save'}
                  </Button>
                  <Button
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    variant="outlined"
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={formData.email}
                  disabled
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  multiline
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Preferences
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Temperature Unit"
                  name="temperatureUnit"
                  value={formData.temperatureUnit}
                  onChange={handleInputChange}
                  disabled={!editMode}
                >
                  <MenuItem value="celsius">Celsius (°C)</MenuItem>
                  <MenuItem value="fahrenheit">Fahrenheit (°F)</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notifications}
                      onChange={handleInputChange}
                      name="notifications"
                      disabled={!editMode}
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setPasswordDialog(true)}
                  fullWidth
                >
                  Change Password
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setDeleteDialog(true)}
                  fullWidth
                >
                  Delete Account
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordChange} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete your account? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
