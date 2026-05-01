from sentence_transformers import SentenceTransformer
from app.core.config import settings
from typing import List
import numpy as np
import logging

logger = logging.getLogger(__name__)

_model = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts."""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return embeddings.tolist()


def embed_single(text: str) -> List[float]:
    """Generate embedding for a single text."""
    return embed_texts([text])[0]
