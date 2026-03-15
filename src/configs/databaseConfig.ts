import mongoose from "mongoose";
import { env } from "./envConfig";

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const dbName = env.NODE_ENV === "production" ? "production" : "development";
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: dbName,
      appName: "Cluster0",
    });
    console.log(
      `✅ MongoDB connected: ${conn.connection.host} (DB: ${dbName})`,
    );
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected.");
};
