import { qdrant, COLLECTION_NAME } from "@/lib/qdrant";

async function setup() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME,
    );

    if (exists) {
      console.log(
        `Collection "${COLLECTION_NAME}" already exists — skipping creation.`,
      );
    } else {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: 3072, distance: "Cosine" },
      });
      console.log(`Collection "${COLLECTION_NAME}" created.`);
    }
  } catch (err) {
    console.error("Failed to check/create collection:", err);
    process.exit(1); // fail loudly - this is a one-time setup script, not a silent-continue context
  }

  await ensurePayloadIndex(COLLECTION_NAME, "userId", {
    type: "keyword",
    is_tenant: true,
  });
  await ensurePayloadIndex(COLLECTION_NAME, "documentId", "keyword");

  console.log("Qdrant collection + indexes ready");
}

async function ensurePayloadIndex(
  collection: string,
  fieldName: string,
  schema: any,
) {
  try {
    await qdrant.createPayloadIndex(collection, {
      field_name: fieldName,
      field_schema: schema,
    });
    console.log(`Index created on "${fieldName}".`);
  } catch (err: any) {
    const alreadyExists =
      err?.status === 409 ||
      err?.data?.status?.error?.includes("already exists");

    if (alreadyExists) {
      console.log(`Index on "${fieldName}" already exists - skipping.`);
    } else {
      console.error(`Failed to create index on "${fieldName}":`, err);
      process.exit(1);
    }
  }
}

setup();
