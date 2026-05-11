import React from 'react';
import { Box, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box sx={{
      px: 4, pt: 4, pb: 3,
      borderBottom: '1px solid rgba(79,142,247,0.08)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 2,
    }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}
