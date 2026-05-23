import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings, COLLECTION_NAME, getVectorStore } from "./vectorStore";

// Phase 1 - Split
export async function splitPDF(
  pdfBuffer: Buffer,
  documentId: string,
  userId: string,
) {
  const blob = new Blob([new Uint8Array(pdfBuffer)], {
    type: "application/pdf",
  });
  const docs = await new PDFLoader(blob).load();

  const chunks = await new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  }).splitDocuments(docs);

  return chunks.map((chunk, index) => ({
    ...chunk,
    metadata: { ...chunk.metadata, documentId, userId, chunkIndex: index },
  }));
}

// Phase 2 - Embed
export async function embedChunks(
  taggedChunks: Awaited<ReturnType<typeof splitPDF>>,
) {
  await QdrantVectorStore.fromDocuments(taggedChunks, embeddings, {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
    collectionName: COLLECTION_NAME,
  });
}

// Phase 3 - Retrieve
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
