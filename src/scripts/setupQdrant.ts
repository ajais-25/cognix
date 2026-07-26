import axios from "axios";

const QDRANT_URL = `${process.env.QDRANT_URL!}:6333`;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;

const headers = {
  "Content-Type": "application/json",
  "api-key": QDRANT_API_KEY,
};

async function createIndexes() {
  // Index on metadata.documentId
  await axios.put(
    `${QDRANT_URL}/collections/document_chunks/index`,
    {
      field_name: "metadata.documentId",
      field_schema: "keyword",
    },
    { headers },
  );

  // Index on metadata.userId
  await axios.put(
    `${QDRANT_URL}/collections/document_chunks/index`,
    {
      field_name: "metadata.userId",
      field_schema: {
        type: "keyword",
        is_tenant: true,
      },
    },
    { headers },
  );
}

createIndexes()
  .then(() => console.log("Indexes created successfully"))
  .catch((err) => console.error("Error creating indexes:", err));
