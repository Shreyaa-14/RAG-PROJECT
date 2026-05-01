import React from 'react';

const dot = (ok) => (
  <span style={{
    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
    background: ok ? 'var(--green)' : 'var(--red)',
    boxShadow: ok ? '0 0 6px var(--green)' : '0 0 6px var(--red)',
    marginRight: 6,
  }} />
);

export default function StatusBar({ health }) {
  if (!health) return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
      <div className="spinner" style={{ width: 12, height: 12 }} />
      connecting...
    </div>
  );

  const pineconeOk = health.services?.pinecone?.includes('connected');
  const groqOk = health.services?.groq?.includes('configured');

  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
      <span>{dot(health.status === 'healthy')} API</span>
      <span>{dot(pineconeOk)} Pinecone</span>
      <span>{dot(groqOk)} Groq</span>
      {health.services?.knowledge_graph && (
        <span style={{ color: 'var(--accent)' }}>
          {health.services.knowledge_graph.total_nodes ?? 0} nodes
        </span>
      )}
    </div>
  );
}
