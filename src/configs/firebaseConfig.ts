import admin from "firebase-admin";
import { env } from "#src/configs/envConfig";

if (!admin.apps.length) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    console.warn("⚠️  Firebase env vars missing — Firebase Admin not initialized.");
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
      });
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error);
    }
  }
}

export { admin };
