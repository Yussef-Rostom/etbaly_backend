import { env } from "#src/configs/envConfig";
import Settings from "#src/models/Settings";

export class AiService {
  private static readonly LIGHTNING_URL_KEY = "LIGHTNING_URL";

  /**
   * Get the Lightning AI service URL from database.
   * Falls back to environment variable if not found in database.
   */
  static async getLightningUrl(): Promise<string> {
    try {
      const setting = await Settings.findOne({ key: this.LIGHTNING_URL_KEY });
      
      if (setting) {
        return setting.value;
      }
      
      // Fallback to environment variable
      return env.LIGHTNING_URL || "";
    } catch (error) {
      console.error("❌ Error fetching Lightning URL from database:", error);
      // Fallback to environment variable on error
      return env.LIGHTNING_URL || "";
    }
  }

  /**
   * Set the Lightning AI service URL in database.
   * Creates or updates the setting.
   */
  static async setLightningUrl(url: string): Promise<string> {
    try {
      const setting = await Settings.findOneAndUpdate(
        { key: this.LIGHTNING_URL_KEY },
        { 
          value: url,
          description: "Lightning AI service endpoint URL for AI-powered content generation"
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      console.log("✅ Lightning URL updated to:", setting.value);
      return setting.value;
    } catch (error) {
      console.error("❌ Error updating Lightning URL in database:", error);
      throw error;
    }
  }
}
