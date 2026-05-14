import mongoose from "mongoose";
import { setServers } from "node:dns/promises";
setServers(["1.1.1.1", "8.8.8.8"]);

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
  if (connection.isConnected) {
    console.log("Already connected to database");
    return;
  }

  try {
    const db = await mongoose.connect(
      `${process.env.MONGODB_URI!}/${process.env.DB_NAME!}` || "",
    );
    // console.log(db);

    connection.isConnected = db.connections[0].readyState;

    console.log("DB connected successfully");
  } catch (error) {
    console.log("Database connection failed", error);

    process.exit(1);
  }
}

export default dbConnect;
