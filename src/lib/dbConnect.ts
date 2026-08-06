import mongoose from "mongoose";
import { setServers } from "node:dns/promises";
setServers(["1.1.1.1", "8.8.8.8"]);

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
  connection.isConnected = 0;
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  connection.isConnected = 0;
});

async function dbConnect(): Promise<void> {
  if (connection.isConnected) {
    console.log("Already connected to database");
    return;
  }

  try {
    const db = await mongoose.connect(
      `${process.env.MONGODB_URI!}/${process.env.DB_NAME!}`,
    );
    connection.isConnected = db.connections[0].readyState;
    console.log("DB connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

export default dbConnect;