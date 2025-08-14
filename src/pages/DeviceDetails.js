import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Paper, Typography, Grid, Button, Box } from '@mui/material';
import { systemAPI } from '../services/api';
import { BatteryFull, Speed, Memory, BrightnessHigh, VolumeUp, Wifi, DevicesOther } from '@mui/icons-material';

const ClickCard = ({ title, value, unit, icon, subtitle, onClick }) => (
  <Paper sx={{ p: 2, height: '100%', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h5">{value}{unit}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
      {icon}
    </Box>
  </Paper>
);

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const [latest, setLatest] = useState(null);

  const load = async () => {
    try {
      const res = await systemAPI.getRange(new Date(Date.now() - 60 * 60 * 1000).toISOString(), new Date().toISOString(), deviceId);
      const arr = res.data || [];
      setLatest(arr[arr.length - 1] || null);
    } catch {}
  };

  useEffect(() => { load(); }, [deviceId]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Device: {deviceId}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="Device" value={latest?.deviceModel || '—'} unit="" icon={<DevicesOther />} subtitle={latest?.deviceManufacturer} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="Battery" value={latest?.batteryPercent ?? '--'} unit="%" icon={<BatteryFull color="success" />} subtitle={latest?.isCharging ? 'Charging' : 'On Battery'} onClick={() => systemAPI.sendCommand(deviceId, 'open-battery-settings')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="CPU Load" value={latest?.cpuLoadPercent ?? '--'} unit="%" icon={<Speed color="info" />} subtitle={latest?.uptimeSeconds ? `Uptime ${Math.floor(latest.uptimeSeconds/3600)}h` : ''} onClick={() => systemAPI.sendCommand(deviceId, 'open-task-manager')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="Memory Used" value={latest?.memoryUsedPercent ?? '--'} unit="%" icon={<Memory color="warning" />} subtitle={
            typeof latest?.memoryFreeMB === 'number' && typeof latest?.memoryTotalMB === 'number'
              ? `${Math.round(latest.memoryTotalMB - latest.memoryFreeMB)}MB / ${latest.memoryTotalMB}MB`
              : ''
          } onClick={() => systemAPI.sendCommand(deviceId, 'open-task-manager')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="Brightness" value={latest?.brightnessPercent ?? '--'} unit="%" icon={<BrightnessHigh color="secondary" />} onClick={() => systemAPI.sendCommand(deviceId, 'open-brightness-settings')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="Volume" value={latest?.volumePercent ?? '--'} unit="%" icon={<VolumeUp color="primary" />} onClick={() => systemAPI.sendCommand(deviceId, 'open-sound-settings')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ClickCard title="Network" value={latest?.isOnline ? 'Online' : 'Offline'} unit="" icon={<Wifi color={latest?.isOnline ? 'success' : 'disabled'} />} subtitle={latest?.networkType || ''} onClick={() => systemAPI.sendCommand(deviceId, 'open-network-settings')} />
        </Grid>
      </Grid>

      <Box mt={2} display="flex" gap={1}>
        <Button variant="outlined" onClick={() => systemAPI.sendCommand(deviceId, 'open-task-manager')}>Open Task Manager</Button>
        <Button variant="outlined" onClick={load}>Refresh</Button>
      </Box>
    </Container>
  );
}


