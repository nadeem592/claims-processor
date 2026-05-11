import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, CircularProgress, Avatar,
  List, ListItem, ListItemText, ListItemAvatar, Divider, Button,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { claimsAPI } from '../services/api';
import PageHeader from '../components/Common/PageHeader';
import StatusChip from '../components/Common/StatusChip';

const STATUS_COLORS = {
  processing: '#FFB547',
  pending_review: '#FF8C42',
  approved: '#10D9A0',
  rejected: '#FF5A6A',
  completed: '#4F8EF7',
};

const statCards = (stats) => [
  { label: 'Total Claims', value: stats.total_claims || 0, icon: <AssignmentRoundedIcon />, color: '#4F8EF7' },
  { label: 'Pending Review', value: stats.by_status?.pending_review || 0, icon: <HourglassTopRoundedIcon />, color: '#FF8C42' },
  { label: 'Approved', value: stats.by_status?.approved || 0, icon: <CheckCircleRoundedIcon />, color: '#10D9A0' },
  { label: 'Rejected', value: stats.by_status?.rejected || 0, icon: <ErrorRoundedIcon />, color: '#FF5A6A' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    claimsAPI.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  const pieData = Object.entries(stats?.by_status || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v, color: STATUS_COLORS[k] || '#4F8EF7' }));

  const docTypeData = Object.entries(stats?.by_document_type || {})
    .map(([k, v]) => ({ name: k.replace(/_/g, ' '), count: v }));

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your claims processing pipeline"
        action={
          <Button variant="contained" onClick={() => navigate('/upload')}>
            + Upload Claim
          </Button>
        }
      />

      <Box sx={{ p: 4 }}>
        {/* Stat Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards(stats || {}).map(card => (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${card.color}18`, color: card.color, width: 48, height: 48 }}>
                  {card.icon}
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: card.color, lineHeight: 1 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.8rem' }}>
                    {card.label}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Status Pie Chart */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: 320 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Claims by Status</Typography>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip
                      contentStyle={{ background: '#0D1829', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8 }}
                      labelStyle={{ color: '#E8EEFF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography color="text.secondary" variant="body2">No data yet</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Doc Types Bar Chart */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, height: 320 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Claims by Document Type</Typography>
              {docTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={docTypeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,142,247,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: '#8899BB', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#8899BB', fontSize: 11 }} />
                    <ReTooltip
                      contentStyle={{ background: '#0D1829', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8 }}
                    />
                    <Bar dataKey="count" fill="#4F8EF7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography color="text.secondary" variant="body2">No data yet</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Recent Claims */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, height: 320, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Claims</Typography>
                <Button size="small" onClick={() => navigate('/claims')} sx={{ fontSize: '0.75rem' }}>
                  View All
                </Button>
              </Box>
              <List dense sx={{ flex: 1, overflow: 'auto' }}>
                {(stats?.recent_claims || []).length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center', mt: 3 }}>
                    No recent claims
                  </Typography>
                ) : (
                  (stats?.recent_claims || []).map((claim, i) => (
                    <React.Fragment key={claim.id}>
                      <ListItem
                        button
                        onClick={() => navigate(`/claims/${claim.id}`)}
                        sx={{ px: 0, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(79,142,247,0.05)', borderRadius: 1 } }}
                      >
                        <ListItemText
                          primary={claim.claimant_name || claim.claim_ref}
                          secondary={claim.claim_ref}
                          primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 500, noWrap: true }}
                          secondaryTypographyProps={{ fontSize: '0.7rem', color: 'text.secondary' }}
                        />
                        <StatusChip status={claim.status} />
                      </ListItem>
                      {i < (stats.recent_claims.length - 1) && <Divider sx={{ borderColor: 'divider' }} />}
                    </React.Fragment>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
