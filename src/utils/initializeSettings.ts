import Settings from "#src/models/Settings";
import { env } from "#src/configs/envConfig";

/**
 * Initialize settings from environment variables if they don't exist in database.
 * This ensures backward compatibility when migrating from env-only to database storage.
 */
export const initializeSettings = async (): Promise<void> => {
  try {
    // Initialize LIGHTNING_URL from environment if not in database
    if (env.LIGHTNING_URL) {
      const existingSetting = await Settings.findOne({ key: "LIGHTNING_URL" });
      
      if (!existingSetting) {
        await Settings.create({
          key: "LIGHTNING_URL",
          value: env.LIGHTNING_URL,
          description: "Lightning AI service endpoint URL for AI-powered content generation",
        });
        console.log("✅ Initialized LIGHTNING_URL setting from environment variable");
      }
    }
  } catch (error) {
    console.error("❌ Error initializing settings:", error);
    // Don't throw - this is not critical for app startup
  }
};
