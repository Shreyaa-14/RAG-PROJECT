# 🧠 MultiModal Graph RAG System

A production-grade **Multi-Modal Retrieval Augmented Generation** system supporting Text, Image (OCR), and Audio (Whisper transcription) with knowledge graph capabilities.

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                      │
│   Query Panel │ Ingest Panel │ Knowledge Graph Panel    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                       │
│                                                         │
│  /api/v1/ingest  →  DocumentProcessor                   │
│      ├── PDF/TXT   →  pdfplumber / plain text           │
│      ├── Images    →  Tesseract OCR (pytesseract)       │
│      └── Audio     →  OpenAI Whisper (local)            │
│                                                         │
│  EmbeddingService  →  SentenceTransformers (local)      │
│      └── all-MiniLM-L6-v2  (384-dim, free)              │
│                                                         │
│  VectorStore       →  Pinecone (serverless)             │
│                                                         │
│  /api/v1/query   →  RAG Pipeline                        │
│      ├── Embed query                                    │
│      ├── Retrieve top-K chunks from Pinecone            │
│      ├── Build context window                           │
│      └── Generate response via Groq (llama3-70b)        │
│                                                         │
│  KnowledgeGraph    →  In-memory node/edge graph          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Clone and configure

```bash
git clone <repo>
cd multimodal-rag
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key        # https://console.groq.com
PINECONE_API_KEY=your_pinecone_key    # https://app.pinecone.io
PINECONE_ENVIRONMENT=us-east-1
```

### 2. Launch with Docker

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

> ⚠️ First launch downloads models (~500MB). Allow 5–10 min.

---

## 📡 API Reference

### POST `/api/v1/ingest`
Upload a file for processing.
- **Accepts**: PDF, TXT, PNG, JPG, WEBP, MP3, WAV, M4A, MP4
- **Returns**: `{ chunks_ingested, modality, doc_id }`

### POST `/api/v1/query`
```json
{
  "query": "What did the speaker say about climate?",
  "top_k": 5,
  "modality_filter": null
}
```
- `modality_filter`: `"text"`, `"image"`, `"audio"`, or `null` for all

### GET `/api/v1/health`
System status — Pinecone, Groq, embedding model, knowledge graph stats.

### GET `/api/v1/graph`
Knowledge graph: document nodes, edges, modality distribution.

### DELETE `/api/v1/ingest/clear`
Wipe all vectors from Pinecone.

---

## 🧩 Modalities

| Modality | Input Formats | Processing |
|----------|--------------|------------|
| **Text** | `.txt`, `.md`, `.pdf` | pdfplumber extraction + chunking |
| **Image** | `.png`, `.jpg`, `.jpeg`, `.webp` | Tesseract OCR |
| **Audio** | `.mp3`, `.wav`, `.m4a`, `.mp4` | OpenAI Whisper (local `base` model) |

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | Required. Groq API key |
| `PINECONE_API_KEY` | — | Required. Pinecone API key |
| `GROQ_MODEL` | `llama3-70b-8192` | Groq model to use |
| `WHISPER_MODEL` | `base` | `tiny`/`base`/`small`/`medium` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | SentenceTransformers model |
| `PINECONE_INDEX_NAME` | `multimodal-rag` | Pinecone index name |
| `MAX_FILE_SIZE_MB` | `50` | Upload size limit |

---

## 🛠 Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in keys
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000/api/v1 npm start
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Framer Motion, react-dropzone, react-markdown |
| Backend | FastAPI, Python 3.11 |
| Embeddings | SentenceTransformers `all-MiniLM-L6-v2` (free, local) |
| Vector DB | Pinecone (serverless) |
| LLM | Groq `llama3-70b-8192` |
| OCR | Tesseract via pytesseract |
| Audio | OpenAI Whisper (local inference) |
| PDF | pdfplumber |
| Containers | Docker + docker-compose |
| Web Server | Nginx (frontend) |

---

## 🗂 Project Structure

```
multimodal-rag/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py
│       │   └── pinecone_client.py
│       ├── api/
│       │   ├── health.py
│       │   ├── ingest.py
│       │   └── query.py
│       └── services/
│           ├── document_processor.py  # Text/PDF/OCR/Audio
│           ├── embedding_service.py   # SentenceTransformers
│           ├── vector_store.py        # Pinecone CRUD
│           ├── llm_service.py         # Groq generation
│           └── knowledge_graph.py     # In-memory graph
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.js / App.css
        ├── utils/api.js
        └── components/
            ├── QueryPanel.js     # RAG chat interface
            ├── UploadPanel.js    # File ingestion UI
            ├── GraphPanel.js     # Knowledge graph viewer
            └── StatusBar.js      # Service health
```
