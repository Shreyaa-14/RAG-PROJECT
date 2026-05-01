import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { queryRAG } from '../utils/api';
import './QueryPanel.css';

const MODALITY_OPTIONS = [
  { value: null, label: 'All Modalities' },
  { value: 'text', label: '📄 Text Only' },
  { value: 'image', label: '🖼 Image Only' },
  { value: 'audio', label: '🎵 Audio Only' },
];

export default function QueryPanel() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [modality, setModality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    setListening(true);

    recognition.onresult = (event) => {
      let transcript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setQuery(transcript);
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === 'not-allowed') {
        toast.error('Microphone permission denied. Please allow mic access.');
      } else {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const submit = async () => {
    if (!query.trim()) return;

    const q = query.trim();
    setQuery('');
    setLoading(true);

    try {
      const res = await queryRAG(q, topK, modality);
      const entry = { query: q, ...res.data, ts: Date.now() };
      setHistory((h) => [...h, entry]);

      const savedHistory = JSON.parse(localStorage.getItem('studyBuddyHistory') || '[]');

      localStorage.setItem(
      'studyBuddyHistory',
      JSON.stringify([...savedHistory, entry])
      );
    } catch (err) {
      const msg = err.response?.data?.detail || 'Query failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      submit();
    }
  };

  return (
    <div className="query-panel">
      <div className="query-layout">
        <div className="chat-area">
          <AnimatePresence>
            {history.length === 0 && !loading && (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="empty-icon">🎓</div>
                <div className="empty-title">Ask Study Buddy</div>
                <div className="empty-sub">
                  Upload your notes, PDFs, images, or audio, then ask questions using text or voice.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {history.map((entry) => (
            <motion.div
              key={entry.ts}
              className="chat-entry"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="chat-query">
                <span className="chat-role">You</span>
                <div className="chat-bubble user">{entry.query}</div>
              </div>

              <div className="chat-answer">
                <span className="chat-role">Study Buddy</span>
                <div className="chat-bubble assistant">
                  <ReactMarkdown>{entry.answer}</ReactMarkdown>

                  <div className="answer-meta">
                    {entry.model && <span className="meta-chip">{entry.model}</span>}
                    {entry.tokens_used && (
                      <span className="meta-chip">{entry.tokens_used} tokens</span>
                    )}
                    {entry.modalities_used?.map((m) => (
                      <span key={m} className={`badge badge-${m}`}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {entry.sources?.length > 0 && (
                <details className="sources-details">
                  <summary>{entry.sources.length} sources retrieved</summary>
                  <div className="sources-list">
                    {entry.sources.map((s, i) => (
                      <div key={i} className="source-item">
                        <div className="source-header">
                          <span className={`badge badge-${s.modality}`}>
                            {s.modality}
                          </span>
                          <span className="source-name">{s.source}</span>
                          <span className="source-score">score: {s.score}</span>
                        </div>
                        <div className="source-preview">{s.preview}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </motion.div>
          ))}

          {loading && (
            <div className="chat-loading">
              <div className="thinking-dots">
                <span />
                <span />
                <span />
              </div>
              <span>Retrieving and generating...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="query-input-bar">
          <div className="query-controls">
            <select
              className="input-field select-sm"
              value={modality ?? ''}
              onChange={(e) => setModality(e.target.value || null)}
            >
              {MODALITY_OPTIONS.map((o) => (
                <option key={o.value ?? 'all'} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="topk-label">
              Top-K:
              <input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="input-field input-sm"
                style={{ width: 60 }}
              />
            </label>
          </div>

          <div className="input-group">
            <textarea
              className="input-field"
              rows={2}
              placeholder={
                listening
                  ? 'Listening... speak now'
                  : 'Ask a question… or click mic to speak'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
            />

            <button
              className={`btn mic-btn ${listening ? 'listening' : ''}`}
              onClick={startVoiceInput}
              type="button"
              title="Voice input"
            >
              {listening ? '🔴' : '🎤'}
            </button>

            <button
              className="btn btn-primary send-btn"
              onClick={submit}
              disabled={loading || !query.trim()}
              type="button"
            >
              {loading ? <div className="spinner" /> : '→'}
            </button>
          </div>

          {listening && (
            <div className="voice-hint">
              Listening... speak your question. Click mic again to stop.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}