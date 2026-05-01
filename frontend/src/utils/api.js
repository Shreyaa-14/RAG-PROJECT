import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 min for audio/large files
});

export const healthCheck = () => api.get('/health');

export const ingestFile = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/ingest', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

export const ingestBatch = (files) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return api.post('/ingest/batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
};

export const clearIndex = () => api.delete('/ingest/clear');

export const queryRAG = (query, topK = 5, modalityFilter = null) =>
  api.post('/query', { query, top_k: topK, modality_filter: modalityFilter });

export const getGraphData = () => api.get('/graph');

export default api;
