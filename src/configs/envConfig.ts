import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
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
  RUNNING_METHOD: process.env.RUNNING_METHOD || "default",
} as const;
