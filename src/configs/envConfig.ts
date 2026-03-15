import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/etbaly",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_TOKEN_SECRET:
    process.env.REFRESH_TOKEN_SECRET || "default-refresh-secret-change-me",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  EMAIL_USER: process.env.EMAIL_USER || "user@gmail.com",
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "password",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "your-google-client-id",
  CLOUDINARY_CLOUD_NAME:
    process.env.CLOUDINARY_CLOUD_NAME || "cloud-name-change-me",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "api-key-change-me",
  CLOUDINARY_API_SECRET:
    process.env.CLOUDINARY_API_SECRET || "api-secret-change-me",
  RUNNING_METHOD: process.env.RUNNING_METHOD || "default",
} as const;
