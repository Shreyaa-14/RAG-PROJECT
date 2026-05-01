import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import UploadPanel from './components/UploadPanel';
import QueryPanel from './components/QueryPanel';
import GraphPanel from './components/GraphPanel';
import StatusBar from './components/StatusBar';
import { healthCheck } from './utils/api';
import './App.css';

const TABS = [
  { id: 'query', label: 'Ask', icon: '💬' },
  { id: 'ingest', label: 'Upload', icon: '📎' },
  { id: 'graph', label: 'Library', icon: '🧠' },
  { id: 'history', label: 'History', icon: '🕘' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('query');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    healthCheck()
      .then((r) => setHealth(r.data))
      .catch(() => setHealth({ status: 'unreachable' }));
  }, []);

  return (
    <div className="app studybuddy-shell">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo">SB</div>
          <div>
            <div className="brand-title">Study Buddy</div>
            <div className="brand-subtitle">AI document assistant</div>
          </div>
        </div>

        <nav className="side-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`side-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="side-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.span className="side-active-pill" layoutId="side-active-pill" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-title">Supported files</div>
          <div className="mini-tags">
            <span>PDF</span>
            <span>TXT</span>
            <span>Image</span>
            <span>Audio</span>
          </div>
        </div>
      </aside>

      <section className="main-shell">
        <header className="topbar">
          <div>
            <h1>
              {activeTab === 'query'
                ? 'Ask your study material'
                : activeTab === 'ingest'
                ? 'Upload study files'
                : 'Knowledge library'}
            </h1>
            <p>
              {activeTab === 'query'
                ? 'Chat with your PDFs, notes, images, and transcripts.'
                : activeTab === 'ingest'
                ? 'Add documents to Pinecone for retrieval.'
                : 'View ingested documents and graph summary.'}
            </p>
          </div>
          <StatusBar health={health} />
        </header>

        <main className="app-main">
          <AnimatePresence mode="wait">
            {activeTab === 'query' && (
              <motion.div key="query" {...fadeSlide} className="panel-motion">
                <QueryPanel />
              </motion.div>
            )}

            {activeTab === 'ingest' && (
              <motion.div key="ingest" {...fadeSlide} className="panel-motion">
                <UploadPanel onSuccess={() => toast.success('Documents ingested!')} />
              </motion.div>
            )}

            {activeTab === 'graph' && (
              <motion.div key="graph" {...fadeSlide} className="panel-motion">
                <GraphPanel />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" {...fadeSlide} className="panel-motion">
              <HistoryPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </section>
    </div>
  );
}

function HistoryPanel() {
  const history = JSON.parse(localStorage.getItem('studyBuddyHistory') || '[]');

  const clearHistory = () => {
    localStorage.removeItem('studyBuddyHistory');
    window.location.reload();
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>Query History</h2>
        <button className="btn" onClick={clearHistory}>Clear History</button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🕘</div>
          <div className="empty-title">No history yet</div>
          <div className="empty-sub">Your previous questions will appear here.</div>
        </div>
      ) : (
        <div className="history-list">
          {history.slice().reverse().map((item, index) => (
            <div className="history-card" key={index}>
              <div className="history-question">{item.query}</div>
              <div className="history-answer">{item.answer}</div>
              <div className="history-time">
                {new Date(item.ts).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};