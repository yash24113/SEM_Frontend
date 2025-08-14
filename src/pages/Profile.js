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
import { profileAPI, twoFAAPI } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';

const TWO_FA_TOKEN_KEY = 'twofa_token';

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
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
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

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.profile?.twoFAEnabled || false);
  const [twoFASetup, setTwoFASetup] = useState(null); // { qr, secret }
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Setup effect to load profile data
  useEffect(() => {
    // If we already have user data, use it to populate the form
    if (user) {
      setProfile(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        temperatureUnit: user.profile?.preferences?.temperatureUnit || 'celsius',
        notifications: user.profile?.preferences?.notifications !== false
      });
    }
    
    // Then fetch the latest profile data
    fetchProfile();
  }, [user]); // Add user to dependency array to update if user data changes

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      const userProfile = response.data;
      
      console.log('Fetched profile data:', userProfile); // Debug log
      
      // If no response data, use the user data from auth context
      if (!userProfile && user) {
        setProfile(user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          bio: user.profile?.bio || '',
          location: user.profile?.location || '',
          temperatureUnit: user.profile?.preferences?.temperatureUnit || 'celsius',
          notifications: user.profile?.preferences?.notifications !== false
        });
      } else {
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
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // If there's an error but we have user data from auth context, use that
      if (user) {
        setProfile(user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          bio: user.profile?.bio || '',
          location: user.profile?.location || '',
          temperatureUnit: user.profile?.preferences?.temperatureUnit || 'celsius',
          notifications: user.profile?.preferences?.notifications !== false
        });
      } else {
        setError('Failed to load profile');
      }
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

  const handleSave = () => {
    setShowUpdateModal(true);
  };

  // State for 2FA verification
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [pendingUpdateData, setPendingUpdateData] = useState(null);


  const handleConfirmUpdate = async () => {
    try {
      setSaving(true);
      setError(null);
      setTwoFAError('');
      
      // Prepare update data
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
      
      // Store the update data for later use if 2FA is required
      setPendingUpdateData(updateData);
      
      // Try to update profile without 2FA first
      try {
        const response = await profileAPI.updateProfile(updateData);
        
        // If we get here, 2FA is not required
        if (avatarFile) {
          await profileAPI.uploadAvatar(avatarFile);
        }
        
        setProfile(response.data);
        updateUser(response.data);
        
        setEditMode(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        setSuccess('Profile updated successfully');
        
        setTimeout(() => setSuccess(null), 3000);
        setShowUpdateModal(false);
      } catch (err) {
        // If 2FA is required, redirect to 2FA page
        if (err.response?.data?.requires2FA) {
          navigate('/profile/2fa-verify', {
            state: {
              mode: 'profile',
              updateData,
              hasAvatar: !!avatarFile,
              avatarFile
            }
          });
        } else {
          throw err;
        }
      }
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
      
      // First attempt to change password without 2FA
      try {
        await profileAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
        
        // If successful, reset the form and show success
        setPasswordDialog(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setSuccess('Password changed successfully');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        // If 2FA is required, redirect to 2FA page
        if (err.response?.data?.requires2FA) {
          navigate('/profile/2fa-verify', {
            state: {
              mode: 'password',
              currentPassword: passwordData.currentPassword,
              newPassword: passwordData.newPassword
            }
          });
        } else {
          throw err;
        }
      }
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

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (profile?.profile?.avatar) {
      return profileAPI.getAvatar(profile.profile.avatar.split('/').pop());
    }
    return null;
  };

  // 2FA handlers
  const handle2FASetup = async () => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      const res = await twoFAAPI.setup();
      setTwoFASetup(res.data); // { qr, secret }
    } catch (err) {
      setTwoFAError('Failed to start 2FA setup.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (!twoFACode) {
      setTwoFAError('Please enter the 2FA code');
      return;
    }

    setTwoFALoading(true);
    setTwoFAError('');
    
    try {
      // Handle 2FA setup verification
      if (twoFASetup) {
        await twoFAAPI.verify(twoFACode, twoFASetup.secret);
        await twoFAAPI.enable(twoFASetup.secret);
        setTwoFAEnabled(true);
        try {
          const refreshed = await profileAPI.getProfile();
          updateUser(refreshed.data);
        } catch {}
        setTwoFASetup(null);
        setTwoFACode('');
      } 
      // Handle profile update verification
      else if (pendingUpdateData) {
        try {
          const updateData = {
            ...pendingUpdateData,
            twoFACode: twoFACode
          };
          
          // First update the profile with 2FA code
          const response = await profileAPI.updateProfile(updateData);
          
          // Then handle avatar upload if there's a new avatar
          let updatedAvatar = null;
          if (avatarFile) {
            const avatarResponse = await profileAPI.uploadAvatar(avatarFile, twoFACode);
            updatedAvatar = avatarResponse.data.avatar;
          }
          
          // Update the profile with the new avatar URL if it was uploaded
          const updatedProfile = {
            ...response.data,
            profile: {
              ...response.data.profile,
              ...(updatedAvatar && { avatar: updatedAvatar })
            }
          };
          
          setProfile(updatedProfile);
          updateUser(updatedProfile);
          
          setEditMode(false);
          setAvatarFile(null);
          setAvatarPreview(null);
          setShow2FAModal(false);
          setTwoFACode('');
          setSuccess('Profile updated successfully');
          
          setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
          console.error('Error updating profile with 2FA:', err);
          throw err;
        }
      }
      // Handle password change with 2FA
      else if (passwordData.currentPassword && passwordData.newPassword) {
        // Include 2FA code in the password change request
        const response = await profileAPI.changePassword(
          passwordData.currentPassword, 
          passwordData.newPassword,
          twoFACode
        );
        
        // Reset form and show success
        setPasswordDialog(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShow2FAModal(false);
        setSuccess('Password changed successfully');
        setTwoFACode('');
        
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('2FA verification failed:', err);
      setTwoFAError(err.response?.data?.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setSaving(false);
      setTwoFALoading(false);
    }
  };

  const handle2FADisable = async () => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await twoFAAPI.disable();
      setTwoFAEnabled(false);
      try {
        const refreshed = await profileAPI.getProfile();
        updateUser(refreshed.data);
      } catch {}
    } catch (err) {
      setTwoFAError('Failed to disable 2FA.');
    } finally {
      setTwoFALoading(false);
    }
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

        {/* 2FA Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Two-Factor Authentication (2FA)
            </Typography>
            {twoFAEnabled ? (
              <>
                <Typography color="success.main" sx={{ mb: 2 }}>2FA is enabled on your account.</Typography>
                <Button variant="outlined" color="error" onClick={handle2FADisable} disabled={twoFALoading}>
                  {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </>
            ) : twoFASetup ? (
              <>
                <Typography sx={{ mb: 2 }}>Scan the QR code below with your Authenticator App (Google Authenticator, Authy, etc.), or enter the secret manually.</Typography>
                <img src={twoFASetup.qr} alt="2FA QR Code" style={{ marginBottom: 16, width: 180, height: 180 }} />
                <Typography variant="body2" sx={{ mb: 2 }}>Secret: <b>{twoFASetup.secret}</b></Typography>
                <TextField
                  label="Enter 6-digit code"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 6 }}
                />
                <div>
                  <Button variant="contained" onClick={handle2FAVerify} disabled={twoFALoading || twoFACode.length !== 6}>
                    {twoFALoading ? 'Verifying...' : 'Verify & Enable'}
                  </Button>
                  <Button variant="text" onClick={() => setTwoFASetup(null)} sx={{ ml: 2 }} disabled={twoFALoading}>
                    Cancel
                  </Button>
                </div>
                {twoFAError && <Typography color="error" sx={{ mt: 1 }}>{twoFAError}</Typography>}
              </>
            ) : (
              <>
                <Typography sx={{ mb: 2 }}>Add an extra layer of security to your account using an Authenticator App.</Typography>
                <Button variant="contained" onClick={handle2FASetup} disabled={twoFALoading}>
                  {twoFALoading ? 'Loading...' : 'Enable 2FA'}
                </Button>
                {twoFAError && <Typography color="error" sx={{ mt: 1 }}>{twoFAError}</Typography>}
              </>
            )}
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

      {/* 2FA Verification Modal for Profile Update */}
      <Dialog 
        open={show2FAModal} 
        onClose={() => !saving && setShow2FAModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Two-Factor Authentication Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please enter the 6-digit verification code from your authenticator app to update your profile.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="twoFACode"
            label="Verification Code"
            type="text"
            fullWidth
            variant="outlined"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={!!twoFAError}
            helperText={twoFAError}
            disabled={saving}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 6
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShow2FAModal(false)} 
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handle2FAVerify} 
            variant="contained" 
            color="primary"
            disabled={!twoFACode || twoFACode.length !== 6 || saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Verify & Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showUpdateModal}
        title="Update Profile"
        message="Are you sure you want to update your profile?"
        onConfirm={handleConfirmUpdate}
        onCancel={() => setShowUpdateModal(false)}
      />
      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </Container>
  );
};

export default Profile;
