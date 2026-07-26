import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2",
  apiKey: process.env.GEMINI_RAG_API_KEY!,
});

const QDRANT_URL = process.env.QDRANT_URL!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;
const COLLECTION_NAME = "document_chunks";

export async function getVectorStore(): Promise<QdrantVectorStore> {
  return QdrantVectorStore.fromExistingCollection(embeddings, {
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    collectionName: COLLECTION_NAME,
  });
}

export { embeddings, COLLECTION_NAME };
