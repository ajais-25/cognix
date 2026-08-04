import UserDocument from "@/models/UserDocument";
import { chunkDocs } from "../chunking";
import dbConnect from "../dbConnect";
import { embedChunks } from "../embeddings";
import { qdrant } from "../qdrant";
import { getPdfBuffer } from "../storage";
import { deductUploadCredits } from "../credits";
import User from "@/models/User";

export async function processPdf(
  userId: string,
  documentId: string,
  key: string,
) {
  const buffer = await getPdfBuffer(key);
  const chunks = await chunkDocs(buffer);
  const { embeddings, itemizedCalls } = await embedChunks(chunks);

  try {
    await qdrant.upsert("documents", {
      points: chunks.map((chunk, i) => ({
        id: `${documentId}-${i}`,
        vector: embeddings[i],
        payload: {
          documentId,
          userId,
          text: chunk.pageContent,
          page: chunk.metadata.loc?.pageNumber ?? null,
        },
      })),
    });
  } catch (err) {
    throw new Error(
      `Failed to upsert chunks to Qdrant for document "${documentId}": ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  const freshUser = await User.findById(userId).select("credits");
  if (!freshUser) {
    throw new Error(`User "${userId}" not found — cannot deduct credits`);
  }

  await deductUploadCredits({
    userId,
    balance: freshUser.credits,
    itemizedCalls,
    totalChunks: embeddings.length,
    referenceId: documentId,
  });

  try {
    await dbConnect();
    await UserDocument.findByIdAndUpdate(documentId, { status: "ready" });
  } catch (err) {
    throw new Error(
      `Failed to update document status for "${documentId}": ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  console.log(
    `Document id: ${documentId} of User ${userId} processed successfully`,
  );
}
