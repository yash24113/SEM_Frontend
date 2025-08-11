import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';
import { styled } from '@mui/material/styles';
import {
  Thermostat,
  Opacity,
  Air,
  Speed,
  WbSunny
} from '@mui/icons-material';

const StyledCard = styled(motion(Card))(({ theme }) => ({
  margin: theme.spacing(1),
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

const ValueDisplay = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 'bold',
  marginTop: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const getAirQualityColor = (value) => {
  if (value < 50) return '#4caf50';
  if (value < 100) return '#ff9800';
  return '#f44336';
};

function SensorCard({ data }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const valueVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  return (
    <StyledCard
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5 }}
    >
      <CardContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {/* Temperature */}
          <Box>
            <Typography variant="h6" color="textSecondary" 
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Thermostat color="error" /> Temperature
            </Typography>
            <motion.div
              variants={valueVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <ValueDisplay color="error">
                {data.temperature}°C
              </ValueDisplay>
            </motion.div>
          </Box>

          {/* Humidity */}
          <Box>
            <Typography variant="h6" color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Opacity color="primary" /> Humidity
            </Typography>
            <motion.div
              variants={valueVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              <ValueDisplay color="primary">
                {data.humidity}%
              </ValueDisplay>
            </motion.div>
          </Box>

          {/* Air Quality */}
          <Box>
            <Typography variant="h6" color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Air /> Air Quality
            </Typography>
            <motion.div
              variants={valueVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <ValueDisplay sx={{ color: getAirQualityColor(data.airQuality) }}>
                {data.airQuality}
              </ValueDisplay>
            </motion.div>
          </Box>

          {/* Pressure */}
          <Box>
            <Typography variant="h6" color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Speed color="info" /> Pressure
            </Typography>
            <motion.div
              variants={valueVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.5 }}
            >
              <ValueDisplay color="info">
                {data.pressure} hPa
              </ValueDisplay>
            </motion.div>
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  );
}

export default SensorCard;
