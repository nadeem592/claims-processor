import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, IconButton, Tooltip, InputAdornment,
  CircularProgress, Chip,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { claimsAPI } from '../services/api';
import PageHeader from '../components/Common/PageHeader';
import StatusChip from '../components/Common/StatusChip';
import { useSnackbar } from 'notistack';

const DOC_TYPE_LABELS = {
  claim_form: 'Claim Form',
  medical_bill: 'Medical Bill',
  receipt: 'Receipt',
  identity_proof: 'ID Proof',
  unknown: 'Unknown',
};

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const result = await claimsAPI.list({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setClaims(result.claims);
      setTotal(result.pagination.total);
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, enqueueSnackbar]);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const handleDelete = async (id, ref) => {
    if (!window.confirm(`Delete claim ${ref}?`)) return;
    try {
      await claimsAPI.delete(id);
      enqueueSnackbar('Claim deleted', { variant: 'success' });
      loadClaims();
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="All Claims"
        subtitle={`${total} total claims in the system`}
        action={
          <Button variant="contained" onClick={() => navigate('/upload')}>
            + Upload New
          </Button>
        }
      />

      <Box sx={{ p: 4 }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, policy, claim ID..."
            size="small"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
            }}
            sx={{ minWidth: 300 }}
          />
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            label="Status"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="pending_review">Pending Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </TextField>
          <Tooltip title="Refresh">
            <IconButton onClick={loadClaims} size="small">
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Claim Ref</TableCell>
                <TableCell>Claimant</TableCell>
                <TableCell>Policy #</TableCell>
                <TableCell>Incident Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : claims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No claims found. Upload a document to get started.
                  </TableCell>
                </TableRow>
              ) : (
                claims.map(claim => (
                  <TableRow
                    key={claim.id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(79,142,247,0.04)' } }}
                    onClick={() => navigate(`/claims/${claim.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'primary.light' }}>
                        {claim.claim_ref}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {claim.claimant_name || <span style={{ color: '#FF8C42' }}>Missing</span>}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {claim.policy_number || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{claim.incident_date || '—'}</TableCell>
                    <TableCell>
                      {claim.claim_amount
                        ? <Chip label={`$${claim.claim_amount}`} size="small" sx={{ bgcolor: 'rgba(16,217,160,0.1)', color: 'secondary.main', fontSize: '0.72rem' }} />
                        : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                      {DOC_TYPE_LABELS[claim.document_type] || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={claim.status} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {new Date(claim.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => navigate(`/claims/${claim.id}`)}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(claim.id, claim.claim_ref)} sx={{ color: 'error.main' }}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </TableContainer>
      </Box>
    </Box>
  );
}
