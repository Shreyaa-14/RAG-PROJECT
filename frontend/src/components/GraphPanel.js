import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getGraphData } from '../utils/api';
import './GraphPanel.css';

export default function GraphPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getGraphData()
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', padding: 32 }}>
      <div className="spinner" /> Loading graph data...
    </div>
  );

  if (!data) return (
    <div style={{ color: 'var(--text-muted)', padding: 32 }}>
      Failed to load graph. Is the backend running?
    </div>
  );

  const { summary, documents } = data;
  const modalities = summary.documents_by_modality || {};

  return (
    <div className="graph-panel">
      {/* Summary Cards */}
      <div className="stat-row">
        {[
          { label: 'Total Nodes', value: summary.total_nodes, color: 'var(--accent)' },
          { label: 'Total Edges', value: summary.total_edges, color: 'var(--purple)' },
          { label: 'Documents', value: documents.length, color: 'var(--green)' },
          ...Object.entries(modalities).map(([k, v]) => ({
            label: k.charAt(0).toUpperCase() + k.slice(1) + ' Docs',
            value: v,
            color: k === 'text' ? 'var(--green)' : k === 'image' ? 'var(--accent)' : 'var(--purple)',
          })),
        ].map((s, i) => (
          <motion.div
            key={i}
            className="stat-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Modality Breakdown */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Modality Distribution</div>
        <div className="modality-bars">
          {Object.entries(modalities).length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents ingested yet</div>
          )}
          {Object.entries(modalities).map(([m, count]) => {
            const total = Object.values(modalities).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? (count / total * 100).toFixed(1) : 0;
            const color = m === 'text' ? 'var(--green)' : m === 'image' ? 'var(--accent)' : 'var(--purple)';
            return (
              <div key={m} className="modality-row">
                <span className={`badge badge-${m}`}>{m}</span>
                <div className="bar-track">
                  <motion.div
                    className="bar-fill"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="bar-pct">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document nodes */}
      <div className="card">
        <div className="card-title">Ingested Documents ({documents.length})</div>
        {documents.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents yet. Go to Ingest tab to add files.</div>
        )}
        <div className="doc-grid">
          {documents.map((doc, i) => (
            <motion.div
              key={doc.id}
              className="doc-node"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="doc-icon">
                {doc.modality === 'text' ? '📄' : doc.modality === 'image' ? '🖼' : '🎵'}
              </div>
              <div className="doc-info">
                <div className="doc-name">{doc.label}</div>
                <div className="doc-meta">
                  <span className={`badge badge-${doc.modality}`}>{doc.modality}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {doc.chunk_count} chunks
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <button className="btn btn-ghost" onClick={load} style={{ marginTop: 16 }}>
        ↻ Refresh
      </button>
    </div>
  );
}
