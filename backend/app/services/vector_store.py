from app.core.pinecone_client import get_index
from app.services.embedding_service import embed_single, embed_texts
from typing import List, Dict, Any, Optional
import uuid
import logging

logger = logging.getLogger(__name__)


def upsert_documents(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Upsert a list of documents into Pinecone.
    Each document: { "text": str, "metadata": dict }
    """
    index = get_index()
    if index is None:
        logger.warning("Pinecone index not available — mock upsert")
        return {"upserted": len(documents), "mock": True}

    texts = [doc["text"] for doc in documents]
    embeddings = embed_texts(texts)

    vectors = []
    for doc, emb in zip(documents, embeddings):
        vec_id = doc.get("id", str(uuid.uuid4()))
        metadata = doc.get("metadata", {})
        metadata["text"] = doc["text"][:1000]  # Store truncated text in metadata
        vectors.append({
            "id": vec_id,
            "values": emb,
            "metadata": metadata,
        })

    index.upsert(vectors=vectors)
    return {"upserted": len(vectors)}


def query_similar(
    query_text: str,
    top_k: int = 5,
    filter: Optional[Dict] = None,
    modality: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Query Pinecone for similar documents."""
    index = get_index()
    if index is None:
        logger.warning("Pinecone index not available — returning empty results")
        return []

    query_embedding = embed_single(query_text)

    query_kwargs = {
        "vector": query_embedding,
        "top_k": top_k,
        "include_metadata": True,
    }

    if filter:
        query_kwargs["filter"] = filter
    elif modality:
        query_kwargs["filter"] = {"modality": {"$eq": modality}}

    response = index.query(**query_kwargs)

    results = []
    for match in response.matches:
        results.append({
            "id": match.id,
            "score": match.score,
            "text": match.metadata.get("text", ""),
            "metadata": match.metadata,
        })

    return results


def delete_all():
    """Delete all vectors from the index."""
    index = get_index()
    if index:
        index.delete(delete_all=True)
        return {"deleted": "all"}
    return {"deleted": "none", "mock": True}
