import os
import sys
from pathlib import Path

try:
    import pysqlite3
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("OPENAI_BASE_URL", "https://test.com/v4")

from fastapi.testclient import TestClient
from app.models.database import Base, engine

Base.metadata.create_all(bind=engine)

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    print("[PASS] /health")


def test_crud_collections():
    # Create
    r = client.post("/api/v1/collections", json={"name": "测试库", "description": "描述"})
    assert r.status_code == 201
    cid = r.json()["id"]
    print(f"[PASS] POST /collections -> id={cid}")

    # List
    r = client.get("/api/v1/collections")
    assert r.status_code == 200
    assert len(r.json()) == 1
    print("[PASS] GET /collections")

    # Get
    r = client.get(f"/api/v1/collections/{cid}")
    assert r.json()["name"] == "测试库"
    print("[PASS] GET /collections/{id}")

    # Update
    r = client.put(f"/api/v1/collections/{cid}", json={"name": "新名称"})
    assert r.json()["name"] == "新名称"
    print("[PASS] PUT /collections/{id}")

    # Stats
    r = client.get(f"/api/v1/collections/{cid}/stats")
    assert r.json()["doc_count"] == 0
    print("[PASS] GET /collections/{id}/stats")

    # Delete
    r = client.delete(f"/api/v1/collections/{cid}")
    assert r.status_code == 200
    print("[PASS] DELETE /collections/{id}")


def test_404():
    r = client.get("/api/v1/collections/9999")
    assert r.status_code == 404


def test_conversations():
    r = client.get("/api/v1/chat/conversations")
    assert r.status_code == 200
    print("[PASS] GET /chat/conversations")


def test_list_empty_documents():
    r = client.get("/api/v1/documents")
    assert r.status_code == 200
    assert r.json() == []
    print("[PASS] GET /documents (empty)")


def main():
    try:
        test_health()
        test_list_empty_documents()
        test_conversations()
        test_404()
        test_crud_collections()
        print("\n=== ALL TESTS PASSED ===")
    except Exception as e:
        print(f"\n=== FAILED ===")
        raise


if __name__ == "__main__":
    main()
