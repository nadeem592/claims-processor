import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, TextField, Button, Divider,
  Chip, Alert, CircularProgress, Accordion, AccordionSummary,
  AccordionDetails, IconButton, Tooltip, MenuItem, Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { claimsAPI } from '../services/api';
import StatusChip from '../components/Common/StatusChip';
import ConfidenceBar from '../components/Common/ConfidenceBar';
import PageHeader from '../components/Common/PageHeader';
import { useSnackbar } from 'notistack';

const CLAIM_FIELDS = [
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'policy_number', label: 'Policy Number' },
  { key: 'claimant_name', label: 'Claimant Name' },
  { key: 'incident_date', label: 'Date of Incident' },
  { key: 'claim_amount', label: 'Claim Amount' },
  { key: 'provider', label: 'Service Provider' },
  { key: 'contact_details', label: 'Contact Details' },
];

function FieldRow({ fieldKey, label, value, confidence, isFlagged, isEditing, editValue, onEdit }) {
  const threshold = 0.75;
  const conf = confidence?.[fieldKey];
  const lowConf = conf !== undefined && conf < threshold;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: isFlagged || lowConf ? 'rgba(255,140,66,0.05)' : 'transparent',
        border: isFlagged || lowConf ? '1px solid rgba(255,140,66,0.2)' : '1px solid transparent',
        mb: 1,
        transition: 'all 0.2s',
      }}
    >
      <Box sx={{ minWidth: 160 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        {isFlagged && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
            <WarningAmberRoundedIcon sx={{ fontSize: 12, color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.65rem' }}>Needs Review</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1 }}>
        {isEditing ? (
          <TextField
            size="small"
            value={editValue}
            onChange={e => onEdit(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ '& input': { fontSize: '0.875rem' } }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              fontWeight: value ? 500 : 400,
              color: value ? 'text.primary' : 'text.secondary',
              fontStyle: value ? 'normal' : 'italic',
              fontFamily: ['claim_id', 'policy_number'].includes(fieldKey) ? 'monospace' : 'inherit',
            }}
          >
            {value || 'Not extracted'}
          </Typography>
        )}

        {conf !== undefined && (
          <Box sx={{ mt: 0.8 }}>
            <ConfidenceBar value={conf} showLabel={false} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function ClaimDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    claimsAPI.get(id)
      .then(c => {
        setClaim(c);
        const initial = {};
        CLAIM_FIELDS.forEach(f => { initial[f.key] = c[f.key] || ''; });
        initial.status = c.status;
        initial.review_notes = c.review_notes || '';
        setEditValues(initial);
      })
      .catch(err => {
        enqueueSnackbar(err.message, { variant: 'error' });
        navigate('/claims');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, enqueueSnackbar]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build corrections list for changed fields
      const corrections = CLAIM_FIELDS
        .filter(f => claim[f.key] !== editValues[f.key] && editValues[f.key] !== undefined)
        .map(f => ({
          field: f.key,
          original_value: claim[f.key] || '',
          corrected_value: editValues[f.key],
        }));

      const updated = await claimsAPI.update(id, {
        ...editValues,
        corrections: corrections.length > 0 ? corrections : undefined,
        reviewed_by: 'claims_adjuster',
      });

      setClaim(updated.claim);
      setEditMode(false);
      enqueueSnackbar('Claim updated successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!claim) return null;

  const { validation_report: vr, confidence_scores: cs } = claim;
  const flaggedFields = new Set(vr?.flagged_fields || []);
  const hasErrors = (vr?.errors || []).length > 0;
  const hasWarnings = (vr?.warnings || []).length > 0;

  return (
    <Box>
      <PageHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton size="small" onClick={() => navigate('/claims')} sx={{ color: 'text.secondary' }}>
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <span>{claim.claim_ref}</span>
            <StatusChip status={claim.status} />
          </Box>
        }
        subtitle={`Processed on ${new Date(claim.created_at).toLocaleString()} · ${claim.processing_duration_ms}ms`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {editMode ? (
              <>
                <Button variant="outlined" onClick={() => setEditMode(false)} disabled={saving}>Cancel</Button>
                <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => setEditMode(true)}>
                Edit Claim
              </Button>
            )}
          </Box>
        }
      />

      <Box sx={{ p: 4 }}>
        <Grid container spacing={3}>
          {/* Left: Extracted Fields */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Extracted Data</Typography>
                <Chip
                  label={claim.document_type?.replace(/_/g, ' ')}
                  size="small"
                  sx={{ bgcolor: 'rgba(79,142,247,0.12)', color: 'primary.main', textTransform: 'capitalize' }}
                />
              </Box>

              {CLAIM_FIELDS.map(f => (
                <FieldRow
                  key={f.key}
                  fieldKey={f.key}
                  label={f.label}
                  value={claim[f.key]}
                  confidence={cs}
                  isFlagged={flaggedFields.has(f.key)}
                  isEditing={editMode}
                  editValue={editValues[f.key] || ''}
                  onEdit={val => setEditValues(prev => ({ ...prev, [f.key]: val }))}
                />
              ))}

              {claim.document_references?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                    Document References
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {claim.document_references.map((ref, i) => (
                      <Chip key={i} label={ref} size="small" sx={{ fontSize: '0.72rem', bgcolor: 'rgba(79,142,247,0.1)' }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>

            {/* Status & Review Notes */}
            {editMode && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Review Decision</Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Status"
                    value={editValues.status || claim.status}
                    onChange={e => setEditValues(prev => ({ ...prev, status: e.target.value }))}
                    size="small"
                  >
                    {['processing', 'pending_review', 'approved', 'rejected', 'completed'].map(s => (
                      <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Review Notes"
                    multiline
                    rows={3}
                    value={editValues.review_notes}
                    onChange={e => setEditValues(prev => ({ ...prev, review_notes: e.target.value }))}
                    size="small"
                    placeholder="Add reviewer notes..."
                  />
                </Stack>
              </Paper>
            )}

            {/* Corrections History */}
            {claim.corrections?.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Correction History</Typography>
                {claim.corrections.map((c, i) => (
                  <Box key={i} sx={{ mb: 1.5, p: 1.5, bgcolor: 'rgba(79,142,247,0.05)', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                      {c.field?.replace(/_/g, ' ')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" sx={{ color: 'error.main', textDecoration: 'line-through', fontSize: '0.8rem' }}>
                        {c.original_value || 'empty'}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary' }}>→</Typography>
                      <Typography variant="body2" sx={{ color: 'secondary.main', fontSize: '0.8rem' }}>
                        {c.corrected_value}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                      {new Date(c.corrected_at).toLocaleString()} by {c.corrected_by}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </Grid>

          {/* Right: Confidence & Validation */}
          <Grid item xs={12} md={5}>
            {/* Validation Report */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Validation Report</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                {vr?.is_valid ? (
                  <CheckCircleOutlineRoundedIcon sx={{ color: 'secondary.main' }} />
                ) : (
                  <ErrorOutlineRoundedIcon sx={{ color: 'error.main' }} />
                )}
                <Typography variant="body2" sx={{ fontWeight: 600, color: vr?.is_valid ? 'secondary.main' : 'error.main' }}>
                  {vr?.is_valid ? 'Validation Passed' : 'Validation Failed'}
                </Typography>
              </Box>

              {hasErrors && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, mb: 1, display: 'block' }}>
                    ERRORS
                  </Typography>
                  {vr.errors.map((e, i) => (
                    <Alert key={i} severity="error" sx={{ mb: 0.5, py: 0.3, fontSize: '0.78rem', borderRadius: 1.5 }}>
                      {e}
                    </Alert>
                  ))}
                </Box>
              )}

              {hasWarnings && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700, mb: 1, display: 'block' }}>
                    WARNINGS
                  </Typography>
                  {vr.warnings.map((w, i) => (
                    <Alert key={i} severity="warning" sx={{ mb: 0.5, py: 0.3, fontSize: '0.78rem', borderRadius: 1.5 }}>
                      {w}
                    </Alert>
                  ))}
                </Box>
              )}

              {!hasErrors && !hasWarnings && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No issues found.</Typography>
              )}

              {vr?.duplicate_check?.is_duplicate && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>
                  Duplicate of: <strong>{vr.duplicate_check.duplicate_claim_id}</strong>
                </Alert>
              )}
            </Paper>

            {/* Confidence Scores */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Confidence Scores</Typography>
              {cs ? (
                <Stack spacing={1}>
                  {Object.entries(cs).map(([field, score]) => (
                    score !== null && score !== undefined ? (
                      <ConfidenceBar key={field} value={score} label={field} />
                    ) : null
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No confidence data available</Typography>
              )}
            </Paper>

            {/* Processing Metadata */}
            <Accordion sx={{ bgcolor: 'background.paper', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Processing Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {[
                    ['OCR Engine', claim.ocr_engine],
                    ['Processing Time', `${claim.processing_duration_ms}ms`],
                    ['Document Pages', claim.documents?.[0]?.page_count || '1'],
                    ['File Size', claim.documents?.[0]?.size ? `${(claim.documents[0].size / 1024).toFixed(0)}KB` : '—'],
                    ['Reviewed By', claim.reviewed_by || '—'],
                  ].map(([k, v]) => (
                    <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{k}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>{v}</Typography>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Raw Text Preview */}
            {claim.raw_text && (
              <Accordion sx={{ bgcolor: 'background.paper', '&:before': { display: 'none' }, mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Raw OCR Text</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      bgcolor: '#070E1C',
                      borderRadius: 1.5,
                      p: 2,
                      maxHeight: 250,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {claim.raw_text}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
