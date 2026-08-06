import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global.mongooseCache || (global.mongooseCache = { conn: null, promise: null });

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise || mongoose.connection.readyState === 0) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };

    const baseUri = process.env.MONGODB_URI!;
    const dbName = process.env.DB_NAME;
    const mongoUri =
      dbName && !baseUri.includes(`/${dbName}`)
        ? `${baseUri}/${dbName}`
        : baseUri;

    cached.promise = mongoose
      .connect(mongoUri, opts)
      .then((m) => {
        console.log("DB connected successfully");
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        console.error("Database connection failed:", err);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;