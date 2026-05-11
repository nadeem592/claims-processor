import React from 'react';
import { Chip } from '@mui/material';

const statusConfig = {
  processing: { label: 'Processing', color: '#FFB547', bg: 'rgba(255,181,71,0.12)' },
  pending_review: { label: 'Needs Review', color: '#FF8C42', bg: 'rgba(255,140,66,0.12)' },
  approved: { label: 'Approved', color: '#10D9A0', bg: 'rgba(16,217,160,0.12)' },
  rejected: { label: 'Rejected', color: '#FF5A6A', bg: 'rgba(255,90,106,0.12)' },
  completed: { label: 'Completed', color: '#4F8EF7', bg: 'rgba(79,142,247,0.12)' },
};

export default function StatusChip({ status, size = 'small' }) {
  const cfg = statusConfig[status] || { label: status, color: '#8899BB', bg: 'rgba(136,153,187,0.12)' };
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        color: cfg.color,
        bgcolor: cfg.bg,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        border: `1px solid ${cfg.color}30`,
      }}
    />
  );
}
