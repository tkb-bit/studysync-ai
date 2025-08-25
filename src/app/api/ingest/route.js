// src/app/api/ingest/route.js

import { ChromaClient } from "chromadb";
import { Ollama } from "ollama";
import pdf from "pdf-extraction"; // <-- Using the new, CORRECT library

// Connect to the running ChromaDB server
const chroma = new ChromaClient({ path: "http://localhost:8000" });
const ollama = new Ollama({ host: "http://localhost:11434" });

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get("file");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    // --- 1. Load and Parse Document using the new library ---
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extractedData = await pdf(buffer);
    const documentText = extractedData.text; // The new library makes this very simple


    // --- 2. Get or Create Chroma Collection ---
    const collection = await chroma.getOrCreateCollection({
      name: "studysync_materials",
      metadata: { "hnsw:space": "cosine" },
    });

    // --- 3. Split Text and Generate Embeddings ---
    const chunks = documentText.split("\n\n").filter(chunk => chunk.trim() !== "");
    let idCounter = Date.now();

    for (const chunk of chunks) {
      const embedding = await ollama.embeddings({
        model: "nomic-embed-text",
        prompt: chunk,
      });

      // --- 4. Store in Chroma DB ---
      await collection.add({
        ids: [`${file.name}-${idCounter++}`],
        embeddings: [embedding.embedding],
        metadatas: [{ source: file.name, content: chunk }],
        documents: [chunk],
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Successfully ingested ${file.name}` }), { status: 200 });

  } catch (error) {
    console.error("Ingestion Error:", error);
    return new Response(JSON.stringify({ error: "Failed to ingest document" }), { status: 500 });
  }
}