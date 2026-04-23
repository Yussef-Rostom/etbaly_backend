import "dotenv/config";

export const env = {
  APP_ENV: process.env.APP_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/etbaly",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_TOKEN_SECRET:
    process.env.REFRESH_TOKEN_SECRET || "default-refresh-secret-change-me",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  EMAIL_USER: process.env.EMAIL_USER || "user@gmail.com",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "password",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  DRIVE_CLIENT_ID: process.env.DRIVE_CLIENT_ID || "",
  DRIVE_CLIENT_SECRET: process.env.DRIVE_CLIENT_SECRET || "",
  DRIVE_REFRESH_TOKEN: process.env.DRIVE_REFRESH_TOKEN || "",
  DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "etbaly_redis_pass",
  WORKER_SERVER_HOST: process.env.WORKER_SERVER_HOST || "localhost",
  WORKER_SERVER_PORT: parseInt(process.env.WORKER_SERVER_PORT || "8080", 10),
} as const;
