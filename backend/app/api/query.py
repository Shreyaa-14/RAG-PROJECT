from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.services.vector_store import query_similar
from app.services.llm_service import generate_response

router = APIRouter()
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    modality_filter: Optional[str] = None  # "text", "image", "audio", or None for all


class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[dict]
    modalities_used: List[str]
    tokens_used: int
    model: str


@router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Process a query through the RAG pipeline."""
    if not request.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    try:
        # 1. Retrieve similar chunks from vector store
        results = query_similar(
            query_text=request.query,
            top_k=request.top_k,
            modality=request.modality_filter,
        )

        if not results:
            return QueryResponse(
                query=request.query,
                answer="No relevant information found in the knowledge base. Please ingest some documents first.",
                sources=[],
                modalities_used=[],
                tokens_used=0,
                model="none",
            )

        # 2. Determine modalities used
        modalities_used = list({
            r.get("metadata", {}).get("modality", "unknown") for r in results
        })

        # 3. Generate response using Groq
        llm_result = generate_response(
            query=request.query,
            context_chunks=results,
            modalities_used=modalities_used,
        )

        # 4. Clean sources for response
        sources = [
            {
                "id": r["id"],
                "score": round(r["score"], 4),
                "source": r.get("metadata", {}).get("source", "unknown"),
                "modality": r.get("metadata", {}).get("modality", "unknown"),
                "preview": r.get("text", "")[:200],
            }
            for r in results
        ]

        return QueryResponse(
            query=request.query,
            answer=llm_result["answer"],
            sources=sources,
            modalities_used=modalities_used,
            tokens_used=llm_result["tokens_used"],
            model=llm_result["model"],
        )

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Query pipeline error: {e}")
        raise HTTPException(500, f"Query failed: {str(e)}")
