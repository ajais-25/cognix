import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const ENDPOINT = "https://s3.eu-central-003.backblazeb2.com";

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.BACKBLAZE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BACKBLAZE_SECRET_ACCESS_KEY!,
  },
});

export async function uploadPdf(buffer: Buffer, key: string): Promise<string> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.BACKBLAZE_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      }),
    );
    return key;
  } catch (err) {
    throw new Error(
      `Failed to upload PDF to storage: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}

export async function getPdfBuffer(key: string): Promise<Buffer> {
  let res;
  try {
    res = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BACKBLAZE_BUCKET_NAME!,
        Key: key,
      }),
    );
  } catch (err) {
    throw new Error(
      `Failed to fetch PDF from storage for key "${key}": ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (!res.Body) {
    throw new Error(`Failed to retrieve PDF from Backblaze B2 for key: ${key}`);
  }

  try {
    const byteArray = await res.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err) {
    throw new Error(
      `Failed to read PDF stream for key "${key}": ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}
