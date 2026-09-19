"""
Minimaler MCP-Server mit RAG-Tools und vLLM-Integration.
Starten:  python mcp_server.py
Erfordert VLLM_SERVER_URL (Default: http://localhost:8000).
"""

import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

from rag_system import rag_system

VLLM_SERVER_URL = os.getenv("VLLM_SERVER_URL", "http://localhost:8000")
HTTP_CLIENT = httpx.AsyncClient(timeout=120.0)

mcp = FastMCP("jessejay-rag")


async def _model_generate(prompt: str) -> str:
    try:
        response = await HTTP_CLIENT.post(
            f"{VLLM_SERVER_URL}/generate",
            json={
                "prompt": prompt,
                "max_new_tokens": 2048,
                "temperature": 0.7,
                "top_k": 50,
                "top_p": 0.9,
                "stream": False,
            },
        )
        response.raise_for_status()
        return response.json()["text"]
    except Exception as e:
        return f"Fehler bei der Generierung: {e}"


@mcp.tool()
async def add_document_to_rag(source: str, source_type: str = "text") -> str:
    """Fuegt ein Dokument zur RAG-Datenbank hinzu.

    Args:
        source: Pfad zur Datei oder URL
        source_type: "text", "pdf" oder "web"
    """
    return await rag_system.add_document(source, source_type)


@mcp.tool()
async def search_rag(query: str, k: Optional[int] = 5) -> dict:
    """Sucht in der RAG-Datenbank nach relevanten Dokumenten.

    Args:
        query: Suchanfrage
        k: Anzahl der Ergebnisse (Default: 5)
    """
    return await rag_system.search(query, k)


@mcp.tool()
async def generate_with_rag(query: str) -> str:
    """Generiert eine Antwort mit RAG-Kontext aus vLLM.

    Args:
        query: Benutzeranfrage
    """
    return await rag_system.generate_with_context(query, _model_generate)


if __name__ == "__main__":
    mcp.run()
