import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embeddings, getVectorStore } from "./vectorStore";
import { PDF_RAG_GET_TITLE_PROMPT } from "@/prompt";
import { gemini } from "./gemini";
import { Document } from "@langchain/core/documents";
import { CallUsageParam } from "./credits";

// helper function for inducing delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Get Title with usage metadata tracking
export async function generateTitleFromChunksWithUsage(
  chunks: Awaited<ReturnType<typeof splitPDF>>,
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
      model: "gemini-3.5-flash-lite",
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

// Phase 2 - Embed with complete itemized pricing tracking
export async function embedChunks(
  taggedChunks: Awaited<ReturnType<typeof splitPDF>>,
): Promise<{
  title: string;
  itemizedCalls: CallUsageParam[];
}> {
  const firstFewChunks = [...taggedChunks]
    .sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex)
    .slice(0, 3);

  const titleResult = await generateTitleFromChunksWithUsage(firstFewChunks);
  const title = titleResult.title;

  const vectorStore = await getVectorStore();

  const prefixedChunks = taggedChunks.map(
    (chunk) => `title: ${title} | text: ${chunk.pageContent}`,
  );

  // Measure embedding tokens accurately
  let totalEmbeddingTokens = 0;
  try {
    const tokenCountRes = await gemini.models.countTokens({
      model: "gemini-embedding-2",
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

  const BATCH_SIZE = 18;
  const vectors: number[][] = [];

  for (let i = 0; i < prefixedChunks.length; i += BATCH_SIZE) {
    const batch = prefixedChunks.slice(i, i + BATCH_SIZE);

    const batchVectors = await embeddings.embedDocuments(batch);
    vectors.push(...batchVectors);

    if (i + BATCH_SIZE < prefixedChunks.length) {
      console.log(
        `Embedded ${vectors.length}/${prefixedChunks.length} chunks. Pausing to respect TPM limits...`,
      );

      // Wait 10 seconds between 18-chunk batches
      await delay(10_000);
    }
  }

  const hasEmptyVector = vectors.some((v) => v.length === 0);

  if (hasEmptyVector) {
    throw new Error("One or more embedding vectors returned with 0 dimensions");
  }

  await vectorStore.addVectors(
    vectors,
    taggedChunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.pageContent,
          metadata: { ...chunk.metadata, title },
        }),
    ),
  );

  const itemizedCalls: CallUsageParam[] = [
    {
      callType: "pdf_title_generation",
      model: "gemini-2.5-flash-lite",
      promptTokens: titleResult.promptTokens,
      outputTokens: titleResult.outputTokens,
      thinkingTokens: titleResult.thinkingTokens,
    },
    {
      callType: "pdf_chunk_embeddings",
      model: "gemini-embedding-2",
      promptTokens: totalEmbeddingTokens,
      outputTokens: 0,
    },
  ];

  return { title, itemizedCalls };
}

// Phase 3 - Retrieve with query embedding token count tracking
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
): Promise<{
  results: RetrievedChunk[];
  queryEmbeddingTokens: number;
}> {
  const vectorStore = await getVectorStore();
  const prefixedQuery = `task: search result | query: ${query}`;

  let queryEmbeddingTokens = Math.max(5, Math.ceil(prefixedQuery.length / 4));
  try {
    const tokenRes = await gemini.models.countTokens({
      model: "gemini-embedding-2",
      contents: prefixedQuery,
    });
    if (tokenRes.totalTokens) {
      queryEmbeddingTokens = tokenRes.totalTokens;
    }
  } catch (err) {
    console.warn("Failed to count query embedding tokens via API:", err);
  }

  const queryVector = await embeddings.embedQuery(prefixedQuery);

  const rawResults = await vectorStore.similaritySearchVectorWithScore(
    queryVector,
    topK,
    {
      must: [
        { key: "metadata.documentId", match: { value: documentId } },
        { key: "metadata.userId", match: { value: userId } },
      ],
    },
  );

  const results = rawResults.map(([doc, score]) => ({
    content: doc.pageContent,
    score,
    chunkIndex: doc.metadata.chunkIndex,
  }));

  return { results, queryEmbeddingTokens };
}
