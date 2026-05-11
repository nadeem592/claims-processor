import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box, Paper, Typography, Button, LinearProgress,
  List, ListItem, ListItemText, ListItemIcon, Alert,
  Chip, Divider,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { documentsAPI } from '../services/api';
import PageHeader from '../components/Common/PageHeader';
import { useSnackbar } from 'notistack';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tiff'],
};

function FileItem({ file, status, progress, error }) {
  const ext = file.name.split('.').pop().toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'TIFF'].includes(ext);

  return (
    <ListItem
      sx={{
        bgcolor: 'rgba(79,142,247,0.04)',
        borderRadius: 2,
        mb: 1,
        border: '1px solid rgba(79,142,247,0.1)',
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {status === 'done' ? (
          <CheckCircleRoundedIcon sx={{ color: 'secondary.main' }} />
        ) : status === 'error' ? (
          <ErrorRoundedIcon sx={{ color: 'error.main' }} />
        ) : (
          <InsertDriveFileRoundedIcon sx={{ color: 'primary.main' }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={file.name}
        secondary={
          status === 'uploading'
            ? `Uploading... ${progress}%`
            : status === 'processing'
            ? 'Processing with AI...'
            : status === 'done'
            ? 'Processed successfully'
            : error || 'Waiting'
        }
        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
        secondaryTypographyProps={{
          fontSize: '0.75rem',
          color: status === 'error' ? 'error.main' : status === 'done' ? 'secondary.main' : 'text.secondary',
        }}
      />
      <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={ext}
          size="small"
          sx={{ bgcolor: isImage ? 'rgba(16,217,160,0.1)' : 'rgba(79,142,247,0.1)', fontSize: '0.65rem' }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {(file.size / 1024).toFixed(0)}KB
        </Typography>
      </Box>
      {status === 'uploading' && (
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: 2, pb: 0.5 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 2, borderRadius: 1 }} />
        </Box>
      )}
    </ListItem>
  );
}

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState([]);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    if (!isUploading) {
      setFiles(prev => [...prev, ...accepted]);
      setResults([]);
    }
  }, [isUploading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejections) => {
      rejections.forEach(r => {
        enqueueSnackbar(`${r.file.name}: ${r.errors[0]?.message}`, { variant: 'error' });
      });
    },
  });

  const updateStatus = (fileName, update) => {
    setFileStatuses(prev => ({ ...prev, [fileName]: { ...prev[fileName], ...update } }));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    setResults([]);

    const processed = [];

    for (const file of files) {
      updateStatus(file.name, { status: 'uploading', progress: 0 });

      try {
        const result = await documentsAPI.upload(file, (pct) => {
          updateStatus(file.name, { status: pct < 100 ? 'uploading' : 'processing', progress: pct });
        });

        updateStatus(file.name, { status: 'done' });
        processed.push({ file: file.name, success: true, claim: result.claim });
        enqueueSnackbar(`${file.name} processed successfully`, { variant: 'success' });
      } catch (err) {
        updateStatus(file.name, { status: 'error', error: err.message });
        processed.push({ file: file.name, success: false, error: err.message });
        enqueueSnackbar(`${file.name}: ${err.message}`, { variant: 'error' });
      }
    }

    setResults(processed);
    setIsUploading(false);
  };

  const handleClear = () => {
    setFiles([]);
    setFileStatuses({});
    setResults([]);
  };

  return (
    <Box>
      <PageHeader
        title="Upload Claim Documents"
        subtitle="Upload PDF or image files for automated extraction and processing"
      />

      <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        {/* Drop Zone */}
        <Paper
          {...getRootProps()}
          sx={{
            p: 6,
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'rgba(79,142,247,0.25)',
            bgcolor: isDragActive ? 'rgba(79,142,247,0.06)' : 'transparent',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'rgba(79,142,247,0.04)',
            },
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadRoundedIcon sx={{ fontSize: 56, color: isDragActive ? 'primary.main' : 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {isDragActive ? 'Drop files here...' : 'Drag & drop claim documents'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            or click to browse
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['PDF', 'JPEG', 'PNG', 'TIFF'].map(t => (
              <Chip key={t} label={t} size="small" sx={{ fontSize: '0.7rem' }} />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            Max 10MB per file · Up to 5 files
          </Typography>
        </Paper>

        {/* File List */}
        {files.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </Typography>
            <List disablePadding>
              {files.map(file => (
                <FileItem
                  key={file.name}
                  file={file}
                  status={fileStatuses[file.name]?.status || 'pending'}
                  progress={fileStatuses[file.name]?.progress || 0}
                  error={fileStatuses[file.name]?.error}
                />
              ))}
            </List>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={isUploading}
                sx={{ flex: 1 }}
              >
                {isUploading ? 'Processing...' : `Process ${files.length} Document${files.length > 1 ? 's' : ''}`}
              </Button>
              <Button variant="outlined" onClick={handleClear} disabled={isUploading}>
                Clear
              </Button>
            </Box>
          </Box>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2, borderColor: 'divider' }} />
            <Typography variant="h6" sx={{ mb: 2 }}>Processing Results</Typography>
            {results.map((r, i) => (
              <Alert
                key={i}
                severity={r.success ? 'success' : 'error'}
                sx={{ mb: 1, borderRadius: 2 }}
                action={
                  r.success && r.claim ? (
                    <Button size="small" onClick={() => navigate(`/claims/${r.claim.id}`)}>
                      View
                    </Button>
                  ) : null
                }
              >
                <strong>{r.file}</strong>
                {r.success
                  ? ` — ${r.claim?.status === 'pending_review' ? 'Needs human review' : 'Processed successfully'} (${r.claim?.claim_ref})`
                  : ` — ${r.error}`}
              </Alert>
            ))}

            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => navigate('/claims')}
            >
              View All Claims →
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
