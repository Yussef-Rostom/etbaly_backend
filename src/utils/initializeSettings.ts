import Settings from "#src/models/Settings";

interface SettingDefinition {
  key: string;
  value: string;
  description: string;
}

/**
 * Default settings to initialize in the database.
 * These settings are created on first startup if they don't exist.
 */
const DEFAULT_SETTINGS: SettingDefinition[] = [
  {
    key: "LIGHTNING_URL",
    value: "",
    description: "Lightning AI service endpoint URL for AI-powered content generation",
  },
];

/**
 * Initialize default settings in database if they don't exist.
 * This ensures all required settings are present for the application to function.
 */
export const initializeSettings = async (): Promise<void> => {
  try {
    const results = await Promise.allSettled(
      DEFAULT_SETTINGS.map(async (setting) => {
        const exists = await Settings.findOne({ key: setting.key });
        
        if (!exists) {
          await Settings.create(setting);
          return { key: setting.key, created: true, error: null };
        }
        
        return { key: setting.key, created: false, error: null };
      })
    );

    const created = results
      .filter((r) => r.status === "fulfilled" && r.value.created)
      .map((r) => (r as PromiseFulfilledResult<{ key: string; created: boolean; error: null }>).value.key);

    if (created.length > 0) {
      console.log(`✅ Initialized ${created.length} setting(s): ${created.join(", ")}`);
    }

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`⚠️  Failed to initialize ${failed.length} setting(s)`);
      failed.forEach((result) => {
        if (result.status === "rejected") {
          console.error("   Error:", result.reason);
        }
      });
    }
  } catch (error) {
    console.error("❌ Error initializing settings:", error);
    // Don't throw - this is not critical for app startup
  }
};
