import { Job, Worker } from "bullmq";
import { redisConnection } from "./lib/redis";
import { processPdf } from "./lib/workers/processPdf";
import UserDocument from "./models/UserDocument";
import dbConnect from "./lib/dbConnect";

const worker = new Worker(
  "pdf-processing",
  async (job: Job) => {
    const { userId, documentId, key } = job.data;
    await dbConnect();
    await UserDocument.findByIdAndUpdate(documentId, { status: "processing" });
    await processPdf(userId, documentId, key);
  },
  {
    connection: redisConnection,
  },
);

worker.on("completed", (job: Job) => {
  console.log(`Job ${job.id} completed for document ${job.data.documentId}`);
});

worker.on("failed", async (job: Job | undefined, err: Error) => {
  if (job === undefined) {
    console.error("Job is undefined in failed event");
    return;
  }

  console.error(`Job ${job.id} failed:`, err.message);
  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    // all retries exhausted - mark as failed in DB
    await dbConnect();

    await UserDocument.findByIdAndUpdate(job.data.documentId, {
      status: "failed",
    });
  }
});

worker.on("error", (err) => {
  console.error(err);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
