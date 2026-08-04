import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function chunkDocs(
  buffer: Buffer,
): Promise<Document<Record<string, any>>[]> {
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  const loader = new PDFLoader(blob, { splitPages: true });

  let docs;
  try {
    docs = await loader.load();
  } catch (err) {
    throw new Error(
      `Failed to parse PDF: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const nonEmptyDocs = docs.filter((d) => d.pageContent.trim().length > 0);

  if (nonEmptyDocs.length === 0) {
    throw new Error(
      "No extractable text found in PDF — it may be a scanned/image-only document requiring OCR.",
    );
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  return splitter.splitDocuments(nonEmptyDocs);
}
