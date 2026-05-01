from pinecone import Pinecone, ServerlessSpec
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_pinecone_client = None
_index = None


def init_pinecone():
    global _pinecone_client, _index
    try:
        if not settings.PINECONE_API_KEY:
            logger.warning("PINECONE_API_KEY not set — running in mock mode")
            return

        _pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)

        existing = [i.name for i in _pinecone_client.list_indexes()]
        if settings.PINECONE_INDEX_NAME not in existing:
            logger.info(f"Creating Pinecone index: {settings.PINECONE_INDEX_NAME}")
            _pinecone_client.create_index(
                name=settings.PINECONE_INDEX_NAME,
                dimension=settings.PINECONE_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=settings.PINECONE_ENVIRONMENT,
                ),
            )

        _index = _pinecone_client.Index(settings.PINECONE_INDEX_NAME)
        logger.info("Pinecone initialized successfully")
    except Exception as e:
        logger.error(f"Pinecone init failed: {e}")


def get_index():
    return _index


def get_client():
    return _pinecone_client
