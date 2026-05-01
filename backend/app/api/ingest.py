from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import List
import os
import uuid
import logging

from app.core.config import settings
from app.services.document_processor import process_file
from app.services.vector_store import upsert_documents, delete_all
from app.services.knowledge_graph import get_graph

router = APIRouter()
logger = logging.getLogger(__name__)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/ingest")
async def ingest_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Ingest a single file (PDF, TXT, image, or audio)."""
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read()

    if len(content) > max_bytes:
        raise HTTPException(413, f"File too large (max {settings.MAX_FILE_SIZE_MB}MB)")

    # Save to temp
    tmp_path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
    with open(tmp_path, "wb") as f:
        f.write(content)

    try:
        chunks, modality = process_file(tmp_path, file.filename)
        if not chunks:
            raise HTTPException(422, "No content extracted from file")

        result = upsert_documents(chunks)

        # Update knowledge graph
        graph = get_graph()
        doc_id = str(uuid.uuid4())
        graph.add_document_node(doc_id, file.filename, modality, len(chunks))
        for chunk in chunks[:20]:  # limit graph nodes
            graph.add_chunk_node(chunk["id"], doc_id, chunk["metadata"]["chunk_index"], chunk["text"])

        return {
            "status": "success",
            "filename": file.filename,
            "modality": modality,
            "chunks_ingested": len(chunks),
            "upserted": result.get("upserted", 0),
            "doc_id": doc_id,
        }

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(500, f"Ingestion failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/ingest/batch")
async def ingest_batch(files: List[UploadFile] = File(...)):
    """Ingest multiple files at once."""
    results = []
    for file in files:
        try:
            content = await file.read()
            tmp_path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
            with open(tmp_path, "wb") as f:
                f.write(content)
            chunks, modality = process_file(tmp_path, file.filename)
            upsert_documents(chunks)
            results.append({"file": file.filename, "status": "ok", "chunks": len(chunks), "modality": modality})
        except Exception as e:
            results.append({"file": file.filename, "status": "error", "error": str(e)})
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    return {"results": results, "total": len(results)}


@router.delete("/ingest/clear")
async def clear_index():
    """Clear all vectors from Pinecone index."""
    result = delete_all()
    return {"status": "cleared", **result}


@router.get("/graph")
async def get_graph_data():
    """Return the knowledge graph summary and document nodes."""
    graph = get_graph()
    return {
        "summary": graph.get_graph_summary(),
        "documents": graph.get_document_nodes(),
        "edges": graph.edges[:100],
    }
