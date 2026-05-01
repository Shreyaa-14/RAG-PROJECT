import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app

client = TestClient(app)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "running"


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "services" in data


def test_query_empty():
    r = client.post("/api/v1/query", json={"query": ""})
    assert r.status_code == 400


@patch("app.api.query.query_similar", return_value=[])
@patch("app.services.llm_service.get_groq_client")
def test_query_no_results(mock_groq, mock_qs):
    r = client.post("/api/v1/query", json={"query": "test query"})
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data
    assert data["sources"] == []


def test_graph_endpoint():
    r = client.get("/api/v1/graph")
    assert r.status_code == 200
    data = r.json()
    assert "summary" in data
    assert "documents" in data


def test_ingest_unsupported_type(tmp_path):
    f = tmp_path / "test.xyz"
    f.write_text("content")
    with open(f, "rb") as fh:
        r = client.post("/api/v1/ingest", files={"file": ("test.xyz", fh, "application/octet-stream")})
    assert r.status_code in [400, 500]
