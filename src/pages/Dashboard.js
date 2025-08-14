import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Select,
  MenuItem as MuiMenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import {
  Thermostat,
  Opacity,
  Air,
  Speed,
  BatteryFull,
  VolumeUp,
  Memory,
  BrightnessHigh,
  DevicesOther,
  Wifi,
  Refresh,
  MoreVert,
  TrendingUp,
  TrendingDown,
  Remove
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subHours, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { environmentAPI, systemAPI } from '../services/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [latestData, setLatestData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [socket, setSocket] = useState(null);
  const [systemLatest, setSystemLatest] = useState(null);
  const [devices, setDevices] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [updateIntervalMs, setUpdateIntervalMs] = useState(30000);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join-dashboard');
    });

    newSocket.on('newEnvironmentData', (data) => {
      setLatestData(data);
      // Update historical data
      setHistoricalData(prev => {
        const newData = [...prev, {
          ...data,
          timestamp: format(new Date(data.timestamp), 'HH:mm')
        }];
        // Keep only last 50 data points
        return newData.slice(-50);
      });
    });

    newSocket.on('systemMetrics', (data) => {
      setSystemLatest(data);
    });
    newSocket.on('systemAlerts', () => {
      // Refresh latest devices list on alert
      fetchDevices();
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await systemAPI.getDevices();
      setDevices(res.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchDashboardData({ silent: false });
    fetchDevices();
  }, [timeRange]);

  // Auto update interval handling
  useEffect(() => {
    if (autoUpdate) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        // Silent refresh to avoid spinner flicker
        fetchDashboardData({ silent: true });
      }, updateIntervalMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoUpdate, updateIntervalMs, timeRange]);

  const fetchDashboardData = async ({ silent } = { silent: false }) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        environmentAPI.getLatestData(),
        environmentAPI.getStats(timeRange),
        systemAPI.getLatest(),
      ]);

      // Latest data handling (treat 404 as no data, not an error)
      if (results[0].status === 'fulfilled') {
        setLatestData(results[0].value.data);
      } else {
        const status = results[0].reason?.response?.status;
        if (status === 404) {
          setLatestData(null);
        } else {
          throw results[0].reason;
        }
      }

      // Stats handling (API already returns zeros when empty, but handle errors)
      if (results[1].status === 'fulfilled') {
        setStats(results[1].value.data);
      } else {
      // System latest
      if (results[2].status === 'fulfilled') {
        setSystemLatest(results[2].value.data);
      }
        // Fallback stats
        setStats({
          avgTemperature: 0,
          avgHumidity: 0,
          avgAirQuality: 0,
          avgPressure: 0,
          avgLightLevel: 0,
          dataPoints: 0
        });
      }

      // Fetch historical data for charts
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '1h':
          startDate.setHours(endDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        default:
          startDate.setDate(endDate.getDate() - 1);
      }

      try {
        const historicalRes = await environmentAPI.getDataByRange(
          startDate.toISOString(),
          endDate.toISOString()
        );
        const formattedData = historicalRes.data.map(item => ({
          ...item,
          timestamp: format(new Date(item.timestamp), timeRange === '1h' ? 'HH:mm' : 'MM/dd HH:mm')
        }));
        setHistoricalData(formattedData);
      } catch (rangeErr) {
        const status = rangeErr?.response?.status;
        if (status === 404) {
          setHistoricalData([]);
        } else {
          throw rangeErr;
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const getAirQualityStatus = (aqi) => {
    if (aqi <= 50) return { label: 'Good', color: 'success' };
    if (aqi <= 100) return { label: 'Moderate', color: 'warning' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: 'error' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'error' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: 'error' };
    return { label: 'Hazardous', color: 'error' };
  };

  const getTemperatureTrend = (current, average) => {
    const diff = current - average;
    if (Math.abs(diff) < 1) return <Remove color="action" />;
    return diff > 0 ? <TrendingUp color="error" /> : <TrendingDown color="primary" />;
  };

  const AnimatedSensorCard = ({ title, value, unit, icon, color, trend, subtitle }) => {
    const springConfig = {
      type: "spring",
      damping: 10,
      stiffness: 100
    };
  
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springConfig}
      >
        <Card
          sx={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: (theme) => theme.shadows[8],
            },
          }}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  {title}
                </Typography>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, ...springConfig }}
                >
                  <Typography variant="h4" component="div" color={color} sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <motion.span
                      key={value}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={springConfig}
                    >
                      {value}
                    </motion.span>
                    {unit}
                  </Typography>
                </motion.div>
                {subtitle && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      {subtitle}
                    </Typography>
                  </motion.div>
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <motion.div
                  initial={{ rotate: -45 }}
                  animate={{ rotate: 0 }}
                  transition={springConfig}
                >
                  {trend}
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {icon}
                </motion.div>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Import motion at the top of the file along with other imports
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <CircularProgress />
        </motion.div>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={{ xs: 2, md: 0 }} mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Smart Environment Monitor
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Welcome back, {user?.name || 'User'}! Here's your environment overview.
            </Typography>
          </Box>
          
          <Box display="flex" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} flexWrap="wrap">
            <FormControlLabel
              control={<Switch checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} />}
              label="Auto Update"
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="update-interval-label">Interval</InputLabel>
              <Select
                labelId="update-interval-label"
                value={updateIntervalMs}
                label="Interval"
                onChange={(e) => setUpdateIntervalMs(Number(e.target.value))}
                disabled={!autoUpdate}
              >
                <MuiMenuItem value={15000}>15s</MuiMenuItem>
                <MuiMenuItem value={30000}>30s</MuiMenuItem>
                <MuiMenuItem value={60000}>1m</MuiMenuItem>
                <MuiMenuItem value={300000}>5m</MuiMenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(e, newValue) => newValue && setTimeRange(newValue)}
              size="small"
            >
              <ToggleButton value="1h">1H</ToggleButton>
              <ToggleButton value="24h">24H</ToggleButton>
              <ToggleButton value="7d">7D</ToggleButton>
              <ToggleButton value="30d">30D</ToggleButton>
            </ToggleButtonGroup>
            
            <IconButton onClick={() => fetchDashboardData({ silent: false })} disabled={loading}>
              <Refresh />
            </IconButton>
            
            <IconButton onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Box>
        </Box>
      </motion.div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); window.location.href = '/profile'; }}>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
      {/* Devices overview */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Devices
        </Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {devices.map((d) => (
            <Grid item xs={12} sm={6} md={3} key={d.deviceId}>
              <AnimatedSensorCard
                title={d.deviceModel || d.deviceId}
                value={d.batteryPercent ?? '--'}
                unit="%"
                icon={<DevicesOther color="action" />}
                color="text.primary"
                subtitle={`Battery • ${d.deviceManufacturer || ''}`}
              />
              <Box mt={1} display="flex" gap={1}>
                <Button size="small" variant="outlined" onClick={() => navigate(`/device/${encodeURIComponent(d.deviceId)}`)}>Open</Button>
                <Button size="small" variant="outlined" onClick={() => systemAPI.sendCommand(d.deviceId, 'open-task-manager')}>Task Manager</Button>
              </Box>
            </Grid>
          ))}
          {devices.length === 0 && systemLatest && (
            <Grid item xs={12} sm={6} md={3} key={systemLatest.deviceId || 'this-device'}>
              <AnimatedSensorCard
                title={systemLatest.deviceModel || systemLatest.deviceId || 'This Device'}
                value={systemLatest.batteryPercent ?? '--'}
                unit="%"
                icon={<DevicesOther color="action" />}
                color="text.primary"
                subtitle={`Battery • ${systemLatest.deviceManufacturer || ''}`}
              />
              <Box mt={1} display="flex" gap={1}>
                {systemLatest.deviceId && (
                  <Button size="small" variant="outlined" onClick={() => navigate(`/device/${encodeURIComponent(systemLatest.deviceId)}`)}>Open</Button>
                )}
                {systemLatest.deviceId && (
                  <Button size="small" variant="outlined" onClick={() => systemAPI.sendCommand(systemLatest.deviceId, 'open-task-manager')}>Task Manager</Button>
                )}
              </Box>
            </Grid>
          )}
          {devices.length === 0 && !systemLatest && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">No devices yet.</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Sensor Cards */}
      <Grid container spacing={{ xs: 2, md: 3 }} mb={{ xs: 2, md: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <AnimatedSensorCard
            title="Temperature"
            value={latestData?.temperature?.toFixed(1) || '--'}
            unit="°C"
            icon={<Thermostat color="error" />}
            color="error"
            trend={stats && getTemperatureTrend(latestData?.temperature, stats.avgTemperature)}
            subtitle={stats && `Avg: ${stats.avgTemperature?.toFixed(1)}°C`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <AnimatedSensorCard
            title="Humidity"
            value={latestData?.humidity?.toFixed(1) || '--'}
            unit="%"
            icon={<Opacity color="primary" />}
            color="primary"
            subtitle={stats && `Avg: ${stats.avgHumidity?.toFixed(1)}%`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <AnimatedSensorCard
            title="Air Quality"
            value={latestData?.airQuality || '--'}
            unit=""
            icon={<Air color="warning" />}
            color="warning"
            subtitle={
              latestData?.airQuality && (
                <Chip
                  label={getAirQualityStatus(latestData.airQuality).label}
                  color={getAirQualityStatus(latestData.airQuality).color}
                  size="small"
                />
              )
            }
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <AnimatedSensorCard
            title="Pressure"
            value={latestData?.pressure?.toFixed(0) || '--'}
            unit=" hPa"
            icon={<Speed color="info" />}
            color="info"
            subtitle={stats && `Avg: ${stats.avgPressure?.toFixed(0)} hPa`}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 300, md: 400 } }}>
            <Typography variant="h6" gutterBottom>
              Temperature & Humidity Trends
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ff6b6b"
                  fill="#ff6b6b"
                  fillOpacity={0.3}
                  name="Temperature (°C)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#4ecdc4"
                  fill="#4ecdc4"
                  fillOpacity={0.3}
                  name="Humidity (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 300, md: 400 } }}>
            <Typography variant="h6" gutterBottom>
              Air Quality Index
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="airQuality"
                  stroke="#ffa726"
                  strokeWidth={2}
                  name="AQI"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* System Status */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          System & Connection Status
        </Typography>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: socket?.connected ? 'success.main' : 'error.main'
                }}
              />
              <Typography variant="body2">
                Connection: {socket?.connected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              Env Last Update: {latestData?.timestamp ? format(new Date(latestData.timestamp), 'HH:mm:ss') : '--'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              Data Points: {historicalData.length}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2">
              Device: {latestData?.deviceId || 'Unknown'}
            </Typography>
          </Grid>
          
        </Grid>
      </Paper>

      {systemLatest && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            This Device
          </Typography>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <div onClick={() => systemLatest?.deviceId && systemAPI.sendCommand(systemLatest.deviceId, 'open-battery-settings')} style={{ cursor: systemLatest?.deviceId ? 'pointer' : 'default' }}>
                <AnimatedSensorCard
                  title="Battery"
                  value={systemLatest?.batteryPercent ?? '--'}
                  unit="%"
                  icon={<BatteryFull color="success" />}
                  color="success.main"
                  subtitle={systemLatest?.isCharging ? 'Charging' : 'On Battery'}
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div onClick={() => systemLatest?.deviceId && systemAPI.sendCommand(systemLatest.deviceId, 'open-task-manager')} style={{ cursor: systemLatest?.deviceId ? 'pointer' : 'default' }}>
                <AnimatedSensorCard
                  title="CPU Load"
                  value={systemLatest?.cpuLoadPercent ?? '--'}
                  unit="%"
                  icon={<Speed color="info" />}
                  color="info.main"
                  subtitle={systemLatest?.uptimeSeconds ? `Uptime: ${Math.floor(systemLatest.uptimeSeconds / 3600)}h` : ''}
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div onClick={() => systemLatest?.deviceId && systemAPI.sendCommand(systemLatest.deviceId, 'open-task-manager')} style={{ cursor: systemLatest?.deviceId ? 'pointer' : 'default' }}>
                <AnimatedSensorCard
                  title="Memory Used"
                  value={systemLatest?.memoryUsedPercent ?? '--'}
                  unit="%"
                  icon={<Memory color="warning" />}
                  color="warning.main"
                  subtitle={
                    typeof systemLatest?.memoryFreeMB === 'number' && typeof systemLatest?.memoryTotalMB === 'number'
                      ? `${Math.round(systemLatest.memoryTotalMB - systemLatest.memoryFreeMB)}MB / ${systemLatest.memoryTotalMB}MB`
                      : ''
                  }
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div onClick={() => systemLatest?.deviceId && systemAPI.sendCommand(systemLatest.deviceId, 'open-brightness-settings')} style={{ cursor: systemLatest?.deviceId ? 'pointer' : 'default' }}>
                <AnimatedSensorCard
                  title="Brightness"
                  value={systemLatest?.brightnessPercent ?? '--'}
                  unit="%"
                  icon={<BrightnessHigh color="secondary" />}
                  color="secondary.main"
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div onClick={() => systemLatest?.deviceId && systemAPI.sendCommand(systemLatest.deviceId, 'open-sound-settings')} style={{ cursor: systemLatest?.deviceId ? 'pointer' : 'default' }}>
                <AnimatedSensorCard
                  title="Volume"
                  value={systemLatest?.volumePercent ?? '--'}
                  unit="%"
                  icon={<VolumeUp color="primary" />}
                  color="primary.main"
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <div onClick={() => systemLatest?.deviceId && systemAPI.sendCommand(systemLatest.deviceId, 'open-network-settings')} style={{ cursor: systemLatest?.deviceId ? 'pointer' : 'default' }}>
                <AnimatedSensorCard
                  title="Network"
                  value={systemLatest?.isOnline ? 'Online' : 'Offline'}
                  unit=""
                  icon={<Wifi color={systemLatest?.isOnline ? 'success' : 'disabled'} />}
                  color={systemLatest?.isOnline ? 'success.main' : 'text.secondary'}
                  subtitle={systemLatest?.networkType || ''}
                />
              </div>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default Dashboard;