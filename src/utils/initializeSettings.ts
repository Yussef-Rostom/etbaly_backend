import Settings from "#src/models/Settings";

/**
 * Initialize default settings in database if they don't exist.
 */
export const initializeSettings = async (): Promise<void> => {
  try {
    // Check if LIGHTNING_URL setting exists, create empty if not
    const existingSetting = await Settings.findOne({ key: "LIGHTNING_URL" });
    
    if (!existingSetting) {
      await Settings.create({
        key: "LIGHTNING_URL",
        value: "",
        description: "Lightning AI service endpoint URL for AI-powered content generation",
      });
      console.log("✅ Initialized LIGHTNING_URL setting (empty - configure via admin panel)");
    }
  } catch (error) {
    console.error("❌ Error initializing settings:", error);
    // Don't throw - this is not critical for app startup
  }
};
