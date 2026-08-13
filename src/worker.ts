import express from "express";
import { Job, Worker } from "bullmq";
import { redisConnection } from "./lib/redis";
import { processPdf } from "./lib/workers/processPdf";
import UserDocument from "./models/UserDocument";
import dbConnect from "./lib/dbConnect";

const app = express();
const PORT = process.env.PORT || 8080;

let lastJobActivity = Date.now();

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

// For Render
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    lastJobActivity: new Date(lastJobActivity).toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Worker HTTP server listening on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
