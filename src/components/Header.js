import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Dashboard as DashboardIcon, Person, Logout, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import { styled } from '@mui/material/styles';

const MotionAppBar = motion(AppBar);

// Utility to get avatar url from user object
const getUserAvatarUrl = (user) => {
  if (user?.profile?.avatar) {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const filename = user.profile.avatar.split('/').pop();
    return `${API_BASE_URL}/api/profile/avatar/${filename}`;
  }
  return null;
};

// Add a small green dot for active status on the profile avatar
const ActiveBadge = styled('span')(({ theme }) => ({
  position: 'absolute',
  bottom: 2,
  right: 2,
  width: 14,
  height: 14,
  backgroundColor: '#44b700',
  borderRadius: '50%',
  border: `2px solid ${theme.palette.background.paper}`,
  boxShadow: '0 0 0 2px #fff',
  zIndex: 2,
}));

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleOpenUserMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleCloseUserMenu();
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  const isActive = (path) => location.pathname === path;

  const toggleDrawer = (open) => () => {
    setMobileOpen(open);
  };

  const drawerContent = (
    <Box sx={{ width: 260 }} role="presentation" onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Avatar
            src={getUserAvatarUrl(user) || undefined}
            sx={{ bgcolor: theme.palette.primary.main }}
          >
            {!getUserAvatarUrl(user) && (user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U')}
          </Avatar>
          <ActiveBadge />
        </Box>
        <Box>
          <Typography variant="subtitle1">{user?.name || 'User'}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>{user?.email}</Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/dashboard" selected={isActive('/dashboard')}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/profile" selected={isActive('/profile')}>
            <ListItemIcon>
              <Person />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogoutClick}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <MotionAppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, rgba(25,118,210,1) 0%, rgba(66,165,245,1) 100%)',
        color: '#fff',
      }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 14 }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isMobile && (
            <IconButton color="inherit" onClick={toggleDrawer(true)} sx={{ mr: 1 }} aria-label="open navigation">
              <MenuIcon />
            </IconButton>
          )}
          <img src="/logo.jpg" alt="Logo" style={{ width: 56, height: 56, marginRight: 16, borderRadius: '100%', background: 'transparent', boxShadow: 'none' }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/dashboard"
            sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
          >
            Smart Environment Monitor
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/dashboard"
            sx={{
              opacity: isActive('/dashboard') ? 1 : 0.9,
              textDecoration: isActive('/dashboard') ? 'underline' : 'none',
              textUnderlineOffset: '6px',
            }}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/profile"
            sx={{
              opacity: isActive('/profile') ? 1 : 0.9,
              textDecoration: isActive('/profile') ? 'underline' : 'none',
              textUnderlineOffset: '6px',
            }}
          >
            Profile
          </Button>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.3)' }} />

          <Tooltip title={user?.name || user?.email || 'Account'}>
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={getUserAvatarUrl(user) || undefined}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
                >
                  {!getUserAvatarUrl(user) && (user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U')}
                </Avatar>
                <ActiveBadge />
              </Box>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
              <Person fontSize="small" style={{ marginRight: 8 }} />
              <Typography textAlign="center">Profile</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogoutClick}>
              <Logout fontSize="small" style={{ marginRight: 8 }} />
              <Typography textAlign="center">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>

        {/* On mobile, just show avatar on the right */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <Tooltip title={user?.name || user?.email || 'Account'}>
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar
                src={getUserAvatarUrl(user) || undefined}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
              >
                {!getUserAvatarUrl(user) && (user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U')}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
              <Person fontSize="small" style={{ marginRight: 8 }} />
              <Typography textAlign="center">Profile</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogoutClick}>
              <Logout fontSize="small" style={{ marginRight: 8 }} />
              <Typography textAlign="center">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={toggleDrawer(false)}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>

      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </MotionAppBar>
  );
}

export default Header;


