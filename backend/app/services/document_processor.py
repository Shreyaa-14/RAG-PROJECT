import os
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)


# ─── Text & PDF ──────────────────────────────────────────────────────────────

def process_text_file(file_path: str, source_name: str) -> List[Dict[str, Any]]:
    """Process a plain text file into chunks."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    return chunk_text(content, source_name, modality="text")


def process_pdf_file(file_path: str, source_name: str) -> List[Dict[str, Any]]:
    """Extract text from PDF and chunk it."""
    try:
        import pdfplumber
        full_text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                full_text += page_text + "\n\n"
        return chunk_text(full_text, source_name, modality="text")
    except Exception as e:
        logger.error(f"PDF processing failed: {e}")
        raise


# ─── Image OCR ───────────────────────────────────────────────────────────────

def process_image_file(file_path: str, source_name: str) -> List[Dict[str, Any]]:
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    """Run OCR on image and return chunks."""
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        if not text.strip():
            text = f"[Image: {source_name} — no readable text detected]"
        return chunk_text(text, source_name, modality="image")
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        raise


# ─── Audio Transcription ─────────────────────────────────────────────────────

def process_audio_file(file_path: str, source_name: str) -> List[Dict[str, Any]]:
    """Transcribe audio using Whisper and chunk the transcript."""
    try:
        import whisper
        from app.core.config import settings

        logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
        model = whisper.load_model(settings.WHISPER_MODEL)
        result = model.transcribe(file_path)
        transcript = result.get("text", "")
        if not transcript.strip():
            transcript = f"[Audio: {source_name} — no transcribable content]"
        return chunk_text(transcript, source_name, modality="audio")
    except Exception as e:
        logger.error(f"Audio transcription failed: {e}")
        raise


# ─── Chunking ─────────────────────────────────────────────────────────────────

def chunk_text(
    text: str,
    source: str,
    modality: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> List[Dict[str, Any]]:
    """Split text into overlapping chunks with metadata."""
    words = text.split()
    chunks = []

    i = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunk_text_str = " ".join(chunk_words)
        if chunk_text_str.strip():
            chunks.append({
                "id": str(uuid.uuid4()),
                "text": chunk_text_str,
                "metadata": {
                    "source": source,
                    "modality": modality,
                    "chunk_index": len(chunks),
                    "word_count": len(chunk_words),
                },
            })
        i += chunk_size - overlap

    return chunks


# ─── Router ───────────────────────────────────────────────────────────────────

def process_file(file_path: str, filename: str) -> Tuple[List[Dict[str, Any]], str]:
    """Route file to the appropriate processor based on extension."""
    ext = Path(filename).suffix.lower()
    source_name = Path(filename).name

    if ext in [".txt", ".md"]:
        return process_text_file(file_path, source_name), "text"
    elif ext == ".pdf":
        return process_pdf_file(file_path, source_name), "text"
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"]:
        return process_image_file(file_path, source_name), "image"
    elif ext in [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".mp4"]:
        return process_audio_file(file_path, source_name), "audio"
    else:
        raise ValueError(f"Unsupported file type: {ext}")
