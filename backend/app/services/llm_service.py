from groq import Groq
from app.core.config import settings
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

_client = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def generate_response(
    query: str,
    context_chunks: List[Dict[str, Any]],
    modalities_used: List[str],
) -> Dict[str, Any]:
    """Generate a RAG response using Groq LLM."""
    client = get_groq_client()

    # Build context string
    context_parts = []
    for i, chunk in enumerate(context_chunks):
        modality = chunk.get("metadata", {}).get("modality", "unknown")
        source = chunk.get("metadata", {}).get("source", "unknown")
        text = chunk.get("text", "")
        score = chunk.get("score", 0)
        context_parts.append(
            f"[Source {i+1} | Modality: {modality} | File: {source} | Relevance: {score:.2f}]\n{text}"
        )

    context_str = "\n\n---\n\n".join(context_parts)

    system_prompt = f"""You are an intelligent Multi-Modal RAG assistant. You answer questions based on retrieved context from multiple data modalities: text documents, images (OCR extracted), and audio transcripts.

Modalities used in this query: {', '.join(modalities_used) if modalities_used else 'all'}

Rules:
- Answer based ONLY on the provided context
- If context is insufficient, say so clearly
- Cite the source number (e.g. [Source 1]) when referencing information
- Be concise but comprehensive
- Distinguish between different modalities when relevant"""

    user_message = f"""Context from knowledge base:

{context_str}

---

Question: {query}

Please provide a detailed answer based on the context above."""

    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=settings.GROQ_MAX_TOKENS,
            temperature=0.1,
        )

        answer = completion.choices[0].message.content
        tokens_used = completion.usage.total_tokens if completion.usage else 0

        return {
            "answer": answer,
            "tokens_used": tokens_used,
            "model": settings.GROQ_MODEL,
        }

    except Exception as e:
        logger.error(f"Groq generation failed: {e}")
        raise
