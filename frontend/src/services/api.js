import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 min for large docs
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const message = err.response?.data?.error || err.message || 'Network error';
    throw new Error(message);
  }
);

export const documentsAPI = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('document', file);
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },

  uploadMultiple: (files, onProgress) => {
    const form = new FormData();
    files.forEach(f => form.append('documents', f));
    return api.post('/documents/upload-multiple', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },
};

export const claimsAPI = {
  list: (params) => api.get('/claims', { params }),
  get: (id) => api.get(`/claims/${id}`),
  update: (id, data) => api.patch(`/claims/${id}`, data),
  delete: (id) => api.delete(`/claims/${id}`),
  getStats: () => api.get('/stats'),
};
