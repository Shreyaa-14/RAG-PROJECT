from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import ingest, query, health
from app.core.config import settings
from app.core.pinecone_client import init_pinecone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up MultiModal RAG API...")
    init_pinecone()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="MultiModal Graph RAG API",
    description="Production-grade Multi-Modal RAG system with knowledge graph capabilities",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(ingest.router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(query.router, prefix="/api/v1", tags=["Query"])


@app.get("/")
async def root():
    return {"message": "MultiModal RAG API", "version": "1.0.0", "status": "running"}
