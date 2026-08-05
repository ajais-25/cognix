import { PDF_RAG_PROMPT_TEMPLATE, PDF_RAG_SYSTEM_PROMPT } from "@/prompt";
import { gemini } from "./gemini";
import { models } from "./models";
import { retrieveChunks } from "./retrieval";

export async function streamAnswer(
  query: string,
  userId: string,
  documentId?: string,
) {
  let chunks, queryEmbeddingTokens;
  try {
    ({ chunks, queryEmbeddingTokens } = await retrieveChunks(query, {
      userId,
      documentId,
      limit: 5,
    }));
  } catch (err) {
    throw new Error(
      `Failed to retrieve relevant chunks: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (chunks.length === 0) {
    return { queryEmbeddingTokens, stream: [] };
  }

  const context = chunks
    .map((c, i) => `[${i + 1}] (page ${c.page ?? "unknown"}): ${c.text}`)
    .join("\n\n");

  const prompt = PDF_RAG_PROMPT_TEMPLATE.replace(
    "{{DOCUMENT_CONTEXT}}",
    context,
  ).replace("{{USER_QUERY}}", query);

  let result;
  try {
    result = await gemini.models.generateContentStream({
      model: models.documentQuery,
      contents: prompt,
      config: {
        systemInstruction: PDF_RAG_SYSTEM_PROMPT,
      },
    });
  } catch (err) {
    throw new Error(
      `Failed to start Gemini stream: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  return { queryEmbeddingTokens, stream: result };
}
