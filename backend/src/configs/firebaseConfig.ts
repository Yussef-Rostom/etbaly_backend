import admin from "firebase-admin";
import { env } from "#src/configs/envConfig";

let firebaseInitialized = false;

if (!admin.apps.length) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    if (!firebaseInitialized) {
      console.warn("⚠️  Firebase env vars missing — Firebase Admin not initialized.");
      firebaseInitialized = true;
    }
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
      });
      console.log("✅ Firebase Admin initialized successfully");
      firebaseInitialized = true;
    } catch (error) {
      console.error("❌ Firebase Admin initialization failed:", error);
    }
  }
}

export { admin };
