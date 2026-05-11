import React from 'react';
import { Box, LinearProgress, Typography, Tooltip } from '@mui/material';

export default function ConfidenceBar({ value, label, showLabel = true }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#10D9A0' : pct >= 60 ? '#FFB547' : '#FF5A6A';

  return (
    <Tooltip title={`${pct}% confidence`} placement="top">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showLabel && (
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 100, fontSize: '0.72rem' }}>
            {label?.replace(/_/g, ' ')}
          </Typography>
        )}
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': {
                bgcolor: color,
                borderRadius: 3,
                transition: 'width 0.8s ease',
              },
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color, fontWeight: 600, minWidth: 32, fontSize: '0.72rem' }}>
          {pct}%
        </Typography>
      </Box>
    </Tooltip>
  );
}
