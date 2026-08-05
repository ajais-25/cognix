import { qdrant } from "./qdrant";
import { embedQuery } from "./embeddings";
import { COLLECTION_NAME } from "@/scripts/setupQdrant";
import { gemini } from "./gemini";
import { models } from "./models";

interface RetrievedChunk {
  text: string;
  documentId: string;
  page: number | null;
  score: number;
}

interface RetrieveOptions {
  userId: string;
  documentId?: string;
  limit?: number;
}

export async function retrieveChunks(
  query: string,
  { userId, documentId, limit = 5 }: RetrieveOptions,
): Promise<{ chunks: RetrievedChunk[]; queryEmbeddingTokens: number }> {
  const prefixedQuery = `task: search result | query: ${query}`;

  let queryEmbeddingTokens = Math.max(5, Math.ceil(prefixedQuery.length / 4));
  try {
    const tokenRes = await gemini.models.countTokens({
      model: models.embedding,
      contents: prefixedQuery,
    });
    if (tokenRes.totalTokens) {
      queryEmbeddingTokens = tokenRes.totalTokens;
    }
  } catch (err) {
    console.warn("Failed to count query embedding tokens via API:", err);
  }

  let queryVector: number[];
  try {
    queryVector = await embedQuery(prefixedQuery);
  } catch (err) {
    throw new Error(
      `Failed to embed query for retrieval: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const filter: any = {
    must: [{ key: "userId", match: { value: userId } }],
  };
  if (documentId) {
    filter.must.push({ key: "documentId", match: { value: documentId } });
  }

  let results;
  try {
    results = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      filter,
      limit,
      with_payload: true,
    });
  } catch (err) {
    throw new Error(
      `Failed to search Qdrant: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const chunks = results
    .filter((r) => r.payload && typeof r.payload.text === "string")
    .map((r) => ({
      text: r.payload!.text as string,
      documentId: r.payload!.documentId as string,
      page: (r.payload!.page as number | null) ?? null,
      score: r.score,
    }));

  return { chunks, queryEmbeddingTokens };
}
