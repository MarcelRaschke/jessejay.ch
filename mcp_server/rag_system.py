"""
RAG System fuer vLLM + MCP
- Unterstuetzt FAISS (lokal) und ChromaDB (lokal)
- Nutzt Sentence Transformers fuer Embeddings
- Dokumenten-Processing (PDF, Text, Web)
"""

import os
import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import chromadb
from chromadb.utils import embedding_functions
import fitz
from bs4 import BeautifulSoup
import requests


class RAGConfig:
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"
    VECTOR_DB_TYPE = "faiss"
    VECTOR_DB_PATH = "./rag_db"
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 50
    TOP_K = 5


class EmbeddingModel:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            cls._model = SentenceTransformer(RAGConfig.EMBEDDING_MODEL)
        return cls._model

    @classmethod
    def embed(cls, text: str) -> np.ndarray:
        return cls.get_model().encode(text, convert_to_numpy=True)

    @classmethod
    def embed_batch(cls, texts: List[str]) -> np.ndarray:
        return cls.get_model().encode(texts, convert_to_numpy=True)


class DocumentProcessor:
    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = RAGConfig.CHUNK_SIZE,
        overlap: int = RAGConfig.CHUNK_OVERLAP,
    ) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunks.append(text[start:end])
            if end == len(text):
                break
            start = end - overlap
        return chunks

    @staticmethod
    def process_pdf(file_path: str) -> List[str]:
        full_text = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                full_text += page.get_text()
        return DocumentProcessor.chunk_text(full_text)

    @staticmethod
    def process_text(file_path: str) -> List[str]:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        return DocumentProcessor.chunk_text(text)

    @staticmethod
    def process_web(url: str) -> List[str]:
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.text, "html.parser")
            for element in soup(["script", "style", "nav", "footer", "head"]):
                element.decompose()
            text = soup.get_text(separator="\n", strip=True)
            return DocumentProcessor.chunk_text(text)
        except Exception as e:
            print(f"Fehler beim Laden von {url}: {e}")
            return []


class VectorDatabase:
    def __init__(
        self,
        db_type: str = RAGConfig.VECTOR_DB_TYPE,
        db_path: str = RAGConfig.VECTOR_DB_PATH,
    ):
        self.db_type = db_type
        self.db_path = db_path
        self.index = None
        self.documents: List[str] = []
        self.metadata: List[Dict] = []
        self.embedding_function = None

        if db_type == "faiss":
            self._init_faiss()
        elif db_type == "chroma":
            self._init_chroma()
        else:
            raise ValueError(f"Unbekannter Datenbank-Typ: {db_type}")

    def _init_faiss(self):
        dimension = 384
        self.index = faiss.IndexFlatL2(dimension)
        os.makedirs(self.db_path, exist_ok=True)
        self.embedding_function = EmbeddingModel.embed

    def _init_chroma(self):
        self.client = chromadb.PersistentClient(path=self.db_path)
        self.collection = self.client.get_or_create_collection(
            name="rag_collection",
            embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name=RAGConfig.EMBEDDING_MODEL
            ),
        )

    def add_documents(
        self, documents: List[str], metadatas: Optional[List[Dict]] = None
    ):
        if metadatas is None:
            metadatas = [{} for _ in documents]

        if self.db_type == "faiss":
            embeddings = EmbeddingModel.embed_batch(documents)
            embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
            self.index.add(embeddings)
            self.documents.extend(documents)
            self.metadata.extend(metadatas)
        else:
            ids = [hashlib.md5(doc.encode()).hexdigest() for doc in documents]
            embeddings = EmbeddingModel.embed_batch(documents)
            self.collection.add(
                documents=documents,
                embeddings=embeddings.tolist(),
                metadatas=metadatas,
                ids=ids,
            )

    def search(self, query: str, k: int = RAGConfig.TOP_K) -> Tuple[List[str], List[float], List[Dict]]:
        if self.db_type == "faiss":
            if self.index is None or self.index.ntotal == 0:
                return [], [], []
            query_embedding = EmbeddingModel.embed(query)
            query_embedding = np.ascontiguousarray(
                np.array([query_embedding]), dtype=np.float32
            )
            distances, indices = self.index.search(query_embedding, k)
            results, scores, meta = [], [], []
            for idx, distance in zip(indices[0], distances[0]):
                if 0 <= idx < len(self.documents):
                    results.append(self.documents[idx])
                    scores.append(float(1.0 / (1.0 + distance)))
                    meta.append(self.metadata[idx])
            return results, scores, meta
        else:
            res = self.collection.query(query_texts=[query], n_results=k)
            docs = res["documents"][0] if res.get("documents") else []
            metas = res["metadatas"][0] if res.get("metadatas") else [{} for _ in docs]
            dists = res["distances"][0] if res.get("distances") else [0.0 for _ in docs]
            scores = [float(1.0 / (1.0 + d)) for d in dists]
            return docs, scores, metas

    def save(self):
        if self.db_type == "faiss":
            os.makedirs(self.db_path, exist_ok=True)
            faiss.write_index(self.index, os.path.join(self.db_path, "faiss_index"))
            with open(os.path.join(self.db_path, "documents.json"), "w", encoding="utf-8") as f:
                json.dump(
                    {"documents": self.documents, "metadata": self.metadata}, f
                )

    def load(self):
        if self.db_type == "faiss":
            index_path = os.path.join(self.db_path, "faiss_index")
            if os.path.exists(index_path):
                self.index = faiss.read_index(index_path)
                with open(
                    os.path.join(self.db_path, "documents.json"), "r", encoding="utf-8"
                ) as f:
                    data = json.load(f)
                    self.documents = data["documents"]
                    self.metadata = data["metadata"]


class RAGSystem:
    def __init__(self):
        self.vector_db = VectorDatabase()
        self.vector_db.load()
        self.document_processor = DocumentProcessor()

    async def add_document(self, source: str, source_type: str = "text") -> str:
        try:
            if source_type == "pdf":
                chunks = self.document_processor.process_pdf(source)
            elif source_type == "web":
                chunks = self.document_processor.process_web(source)
            else:
                chunks = self.document_processor.process_text(source)

            if not chunks:
                return f"Keine Inhalte aus {source} extrahiert"

            metadatas = [
                {"source": source, "source_type": source_type, "chunk_index": i}
                for i in range(len(chunks))
            ]
            self.vector_db.add_documents(chunks, metadatas)
            self.vector_db.save()
            return f"{len(chunks)} Chunks aus {source} hinzugefuegt"
        except Exception as e:
            return f"Fehler beim Hinzufuegen von {source}: {str(e)}"

    async def search(self, query: str, k: int = RAGConfig.TOP_K) -> Dict[str, Any]:
        try:
            documents, scores, metadatas = self.vector_db.search(query, k)
            results = [
                {"text": doc, "score": float(score), "metadata": meta}
                for doc, score, meta in zip(documents, scores, metadatas)
            ]
            return {"query": query, "results": results, "count": len(results)}
        except Exception as e:
            return {"query": query, "error": str(e), "results": [], "count": 0}

    async def generate_with_context(
        self, query: str, model_generate_func, k: int = RAGConfig.TOP_K
    ) -> str:
        search_results = await self.search(query, k)
        if not search_results["results"]:
            return await model_generate_func(query)

        context = "\n\n".join(
            f"[Dokument {i + 1}]:\n{result['text']}"
            for i, result in enumerate(search_results["results"])
        )

        system_prompt = (
            "Du bist ein hilfreiches KI-Assistent.\n"
            "Nutze die folgenden Kontextinformationen, um deine Antwort zu verbessern.\n"
            "Wenn der Kontext nicht relevant ist, ignoriere ihn.\n\n"
            f"Kontext:\n{context}\n\n"
            f"Frage: {query}\n\n"
            "Antworte basierend auf dem Kontext und deinem Wissen."
        )
        return await model_generate_func(system_prompt)


rag_system = RAGSystem()
