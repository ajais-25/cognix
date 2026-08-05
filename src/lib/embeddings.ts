import { PDF_RAG_GET_TITLE_PROMPT } from "@/prompt";
import { Document } from "@langchain/core/documents";
import { gemini } from "./gemini";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { CallUsageParam } from "./credits";
import { models } from "./models";
const BATCH_SIZE = 98;

// helper function for inducing delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const embeddingClient = new GoogleGenerativeAIEmbeddings({
  model: models.embedding,
  apiKey: process.env.GEMINI_RAG_API_KEY!,
});

export async function generateTitleFromChunksWithUsage(
  chunks: Document<Record<string, any>>[],
  maxChars: number = 3000,
): Promise<{
  title: string;
  promptTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
}> {
  try {
    let combined = "";
    for (const chunk of chunks) {
      if (combined.length >= maxChars) break;
      combined += chunk.pageContent + "\n\n";
    }
    combined = combined.slice(0, maxChars);

    const titlePrompt = `
      ${PDF_RAG_GET_TITLE_PROMPT}
  
      Document excerpt:
      ${combined}
    `;

    const result = await gemini.models.generateContent({
      model: models.titleGeneration,
      contents: titlePrompt,
    });

    const raw = result.text?.trim();
    const title =
      raw && raw.toLowerCase().replace(/\.$/, "") !== "none" ? raw : "none";

    const usage = result.usageMetadata;
    const promptTokens =
      usage?.promptTokenCount ?? Math.ceil(titlePrompt.length / 4);
    const outputTokens =
      usage?.candidatesTokenCount ?? Math.ceil((raw?.length ?? 10) / 4);
    const thinkingTokens = usage?.thoughtsTokenCount;

    return { title, promptTokens, outputTokens, thinkingTokens };
  } catch (error) {
    console.error("Title generation failed, falling back to 'none':", error);

    return { title: "none", promptTokens: 750, outputTokens: 5 };
  }
}

export async function embedChunks(
  chunks: Document<Record<string, any>>[],
): Promise<{ embeddings: number[][]; itemizedCalls: CallUsageParam[] }> {
  const firstFewChunks = [...chunks]
    .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
    .slice(0, 3);

  const titleResult = await generateTitleFromChunksWithUsage(firstFewChunks);
  const title = titleResult.title;

  const prefixedChunks = chunks.map(
    (chunk) => `title: ${title} | text: ${chunk.pageContent}`,
  );

  // Measure embedding tokens accurately
  let totalEmbeddingTokens = 0;
  try {
    const tokenCountRes = await gemini.models.countTokens({
      model: models.embedding,
      contents: prefixedChunks.join("\n"),
    });
    totalEmbeddingTokens = tokenCountRes.totalTokens ?? 0;
  } catch (err) {
    console.warn("Failed to count embedding tokens via API, estimating:", err);
  }

  if (!totalEmbeddingTokens || totalEmbeddingTokens === 0) {
    const totalChars = prefixedChunks.reduce((acc, str) => acc + str.length, 0);
    totalEmbeddingTokens = Math.max(10, Math.ceil(totalChars / 4));
  }

  const embeddings = [];

  for (let i = 0; i < prefixedChunks.length; i += BATCH_SIZE) {
    const batch = prefixedChunks.slice(i, i + BATCH_SIZE);
    const embedding = await embedBatchWithRetry(batch);
    embeddings.push(...embedding);

    if (i + BATCH_SIZE < prefixedChunks.length) {
      console.log(
        `Embedded ${embeddings.length}/${prefixedChunks.length} chunks. Pausing to respect Rate limits...`,
      );

      // Wait 1 minute between 98-chunk batches
      await delay(60_000);
    }
  }

  const itemizedCalls: CallUsageParam[] = [
    {
      callType: "pdf_title_generation",
      model: models.titleGeneration,
      promptTokens: titleResult.promptTokens,
      outputTokens: titleResult.outputTokens,
      thinkingTokens: titleResult.thinkingTokens,
    },
    {
      callType: "pdf_chunk_embeddings",
      model: models.embedding,
      promptTokens: totalEmbeddingTokens,
      outputTokens: 0,
    },
  ];

  return { embeddings, itemizedCalls };
}

async function embedBatchWithRetry(
  batch: string[],
  retries = 5,
): Promise<number[][]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await embeddingClient.embedDocuments(batch);
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 || err?.message?.includes("RESOURCE_EXHAUSTED");
      const isLast = attempt === retries - 1;

      if (!isRateLimit || isLast) throw err;

      const backoff = isRateLimit ? 60_000 : Math.pow(2, attempt) * 2000;
      console.warn(`Rate limited, backing off ${backoff}ms...`);
      await delay(backoff);
    }
  }
  throw new Error("unreachable");
}

export async function embedQuery(query: string): Promise<number[]> {
  try {
    return await embeddingClient.embedQuery(query);
  } catch (err) {
    throw new Error(
      `Failed to embed query: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}
