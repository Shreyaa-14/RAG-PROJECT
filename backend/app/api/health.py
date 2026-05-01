from fastapi import APIRouter
from app.core.pinecone_client import get_index
from app.core.config import settings
from app.services.knowledge_graph import get_graph

router = APIRouter()


@router.get("/health")
async def health_check():
    pinecone_ok = get_index() is not None
    groq_ok = bool(settings.GROQ_API_KEY)
    graph = get_graph()

    return {
        "status": "healthy",
        "services": {
            "pinecone": "connected" if pinecone_ok else "not connected (mock mode)",
            "groq": "configured" if groq_ok else "not configured",
            "embeddings": "sentence-transformers (local)",
            "knowledge_graph": graph.get_graph_summary(),
        },
    }
