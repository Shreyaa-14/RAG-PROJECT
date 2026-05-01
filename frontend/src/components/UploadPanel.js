import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ingestFile, clearIndex } from '../utils/api';
import './UploadPanel.css';

const ACCEPTED = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-m4a': ['.m4a'],
  'video/mp4': ['.mp4'],
};

const MODALITY_MAP = {
  txt: 'text', md: 'text', pdf: 'text',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image',
  mp3: 'audio', wav: 'audio', m4a: 'audio', mp4: 'audio',
};

function getModalityFromFile(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return MODALITY_MAP[ext] || 'unknown';
}

export default function UploadPanel({ onSuccess }) {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback((accepted) => {
    const items = accepted.map((f) => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      status: 'pending',
      modality: getModalityFromFile(f.name),
      progress: 0,
      result: null,
    }));
    setQueue((q) => [...q, ...items]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED, multiple: true,
  });

  const processQueue = async () => {
    setProcessing(true);
    for (const item of queue.filter((i) => i.status === 'pending')) {
      setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'uploading' } : i));
      try {
        const res = await ingestFile(item.file, (pct) =>
          setQueue((q) => q.map((i) => i.id === item.id ? { ...i, progress: pct } : i))
        );
        setQueue((q) => q.map((i) =>
          i.id === item.id ? { ...i, status: 'done', result: res.data, progress: 100 } : i
        ));
      } catch (err) {
        const msg = err.response?.data?.detail || err.message;
        setQueue((q) => q.map((i) =>
          i.id === item.id ? { ...i, status: 'error', result: { error: msg } } : i
        ));
        toast.error(`Failed: ${item.file.name}`);
      }
    }
    setProcessing(false);
    onSuccess?.();
    toast.success('All files processed!');
  };

  const removeItem = (id) => setQueue((q) => q.filter((i) => i.id !== id));
  const clearAll = async () => {
    if (window.confirm('Clear ALL vectors from Pinecone? This cannot be undone.')) {
      await clearIndex();
      setQueue([]);
      toast.success('Index cleared');
    }
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;

  return (
    <div className="upload-panel">
      <div className="upload-grid">
        <div>
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <div className="dropzone-icon">◈</div>
            <div className="dropzone-title">
              {isDragActive ? 'Release to drop files' : 'Drop files or click to browse'}
            </div>
            <div className="dropzone-sub">
              PDF · TXT · PNG · JPG · MP3 · WAV · M4A
            </div>
            <div className="modality-chips">
              <span className="badge badge-text">📄 Text/PDF</span>
              <span className="badge badge-image">🖼 Image </span>
              <span className="badge badge-audio">🎵 Audio file</span>
            </div>
          </div>

          <div className="upload-actions">
            <button
              className="btn btn-primary"
              onClick={processQueue}
              disabled={processing || pendingCount === 0}
            >
              {processing ? <><div className="spinner" /> Processing...</> : `Ingest ${pendingCount || ''} Files`}
            </button>
            <button className="btn btn-ghost" onClick={() => setQueue([])}>Clear Queue</button>
            <button className="btn btn-danger" onClick={clearAll}>Clear Index</button>
          </div>
        </div>

        <div className="queue-list">
          <div className="card-title">Upload Queue ({queue.length})</div>
          <AnimatePresence>
            {queue.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '16px 0' }}>
                No files queued yet
              </div>
            )}
            {queue.map((item) => (
              <motion.div
                key={item.id}
                className={`queue-item ${item.status}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
              >
                <div className="queue-item-header">
                  <span className={`badge badge-${item.modality}`}>{item.modality}</span>
                  <span className="queue-name">{item.file.name}</span>
                  <span className="queue-size">{(item.file.size / 1024).toFixed(0)}KB</span>
                  {item.status === 'pending' && (
                    <button className="btn-icon" onClick={() => removeItem(item.id)}>×</button>
                  )}
                </div>
                {item.status === 'uploading' && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === 'done' && item.result && (
                  <div className="queue-result ok">
                    ✓ {item.result.chunks_ingested} chunks ingested
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="queue-result err">✗ {item.result?.error}</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
