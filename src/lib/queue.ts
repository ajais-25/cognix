import { Queue } from "bullmq";
import { redisConnection as connection } from "./redis";

export const pdfQueue = new Queue("pdf-processing", { connection });

export async function queuePdfProcessing(
  userId: string,
  documentId: string,
  key: string,
) {
  await pdfQueue.add(
    "process-pdf",
    { userId, documentId, key },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 3600 }, // keep completed jobs for 1hr
      removeOnFail: false,
    },
  );
}
