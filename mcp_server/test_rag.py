"""Test-Skript fuer das RAG-System (ohne laufenden vLLM-Server)."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag_system import rag_system


async def test_rag():
    test_path = "/tmp/test_doc.txt"
    with open(test_path, "w", encoding="utf-8") as f:
        f.write(
            "Dies ist ein Testdokument fuer RAG. Es enthaelt Informationen "
            "ueber KI und maschinelles Lernen. Maschinelles Lernen ist ein "
            "Teilbereich der KI."
        )

    print("Dokument hinzufuegen...")
    result = await rag_system.add_document(test_path, "text")
    print(result)

    print("\nSuche testen...")
    results = await rag_system.search("Was ist maschinelles Lernen?")
    print(f"Gefunden: {results['count']} Ergebnisse")
    for i, res in enumerate(results["results"]):
        print(f"\nErgebnis {i + 1} (Score: {res['score']:.3f}):")
        print(res["text"][:200])

    print("\nGenerierung mit Kontext testen...")
    async def dummy_generate(prompt):
        return "Testantwort basierend auf dem Kontext."

    response = await rag_system.generate_with_context(
        "Was ist maschinelles Lernen?", dummy_generate
    )
    print(response)


if __name__ == "__main__":
    asyncio.run(test_rag())
