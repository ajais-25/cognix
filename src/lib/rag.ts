import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings, COLLECTION_NAME, getVectorStore } from "./vectorStore";

// ─── INGESTION ───────────────────────────────────────────────

interface IngestResult {
  totalChunks: number;
}

export async function ingestPDF(
  pdfBuffer: Buffer,
  documentId: string,
  userId: string,
): Promise<IngestResult> {
  // 1. Load PDF from buffer
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: "application/pdf",
  });
  const loader = new PDFLoader(blob);
  const docs = await loader.load();

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);

  // 3. Attach metadata for filtering
  const taggedChunks = chunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      documentId,
      userId,
      chunkIndex: index,
    },
  }));

  // 4. Embed + store in Qdrant
  await QdrantVectorStore.fromDocuments(taggedChunks, embeddings, {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
    collectionName: COLLECTION_NAME,
  });

  return { totalChunks: taggedChunks.length };
}

// ─── RETRIEVAL ───────────────────────────────────────────────

interface RetrievedChunk {
  content: string;
  score: number;
  chunkIndex: number;
}

export async function retrieveChunks(
  query: string,
  documentId: string,
  userId: string,
  topK: number = 5,
): Promise<RetrievedChunk[]> {
  const vectorStore = await getVectorStore();

  // Similarity search with metadata filtering
  const results = await vectorStore.similaritySearchWithScore(query, topK, {
    must: [
      { key: "metadata.documentId", match: { value: documentId } },
      { key: "metadata.userId", match: { value: userId } },
    ],
  });

  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    score,
    chunkIndex: doc.metadata.chunkIndex,
  }));
}
