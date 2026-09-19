# MCP-Server mit RAG (Teil 1)

Eigenständiger Python-MCP-Server mit Retrieval-Augmented Generation, isoliert
von der statischen Website im Repository-Root.

## Struktur
```
mcp_server/
├── rag_system.py       # RAG-Engine (FAISS/ChromaDB, Embeddings, Chunking)
├── mcp_server.py       # MCP-Server mit RAG-Tools + vLLM-Anbindung
├── test_rag.py         # Test ohne laufenden vLLM-Server
├── requirements.txt    # Python-Abhängigkeiten
├── Dockerfile          # Container-Image
└── .env.example        # Konfiguration (VLLM_SERVER_URL)
```

## Setup
```bash
cd mcp_server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # VLLM_SERVER_URL anpassen
```

## Test (ohne vLLM)
```bash
python test_rag.py
```

## Server starten
```bash
python mcp_server.py
```
Erfordert einen erreichbaren vLLM-Server unter `VLLM_SERVER_URL`.

## MCP-Tools
- `add_document_to_rag(source, source_type)` — Dokument hinzufügen (`text`/`pdf`/`web`)
- `search_rag(query, k)` — Semantische Suche
- `generate_with_rag(query)` — Antwort mit RAG-Kontext via vLLM

## Konfiguration (`RAGConfig` in `rag_system.py`)
- `EMBEDDING_MODEL`: all-MiniLM-L6-v2 (384-Dim)
- `VECTOR_DB_TYPE`: `faiss` (lokal) oder `chroma`
- `CHUNK_SIZE` / `CHUNK_OVERLAP`: 512 / 50
- `TOP_K`: 5
