import mongoose from "mongoose";
import { env } from "#src/configs/envConfig";
import { dropStaleIndexes } from "#src/jobs/migrations/dropStaleIndexes";

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const dbName = env.APP_ENV === "production" ? "production" : "development";
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: dbName,
      appName: "Cluster0",
    });
    console.log(
      `✅ MongoDB connected: ${conn.connection.host} (DB: ${dbName})`,
    );
    await dropStaleIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  console.log("🔌 MongoDB disconnected.");
};
