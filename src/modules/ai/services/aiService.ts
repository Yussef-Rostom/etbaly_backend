import Settings from "#src/models/Settings";
import { AppError } from "#src/utils/AppError";

export class AiService {
  private static readonly LIGHTNING_URL_KEY = "LIGHTNING_URL";

  /**
   * Get the Lightning AI service URL from database.
   * @throws {AppError} If the setting is not configured
   */
  static async getLightningUrl(): Promise<string> {
    const setting = await Settings.findOne({ key: this.LIGHTNING_URL_KEY });
    
    if (!setting || !setting.value) {
      throw new AppError(
        "Lightning AI service URL is not configured. Please configure it via the admin panel.",
        503
      );
    }
    
    return setting.value;
  }

  /**
   * Set the Lightning AI service URL in database.
   * Creates or updates the setting.
   * @throws {AppError} If URL validation fails
   */
  static async setLightningUrl(url: string): Promise<string> {
    // Validate URL format
    if (!url || typeof url !== 'string') {
      throw new AppError("Invalid URL: URL must be a non-empty string", 400);
    }

    try {
      new URL(url);
    } catch {
      throw new AppError("Invalid URL format", 400);
    }

    const setting = await Settings.findOneAndUpdate(
      { key: this.LIGHTNING_URL_KEY },
      { 
        value: url,
        description: "Lightning AI service endpoint URL for AI-powered content generation"
      },
      { 
        upsert: true, 
        returnDocument: 'after',
        runValidators: true
      }
    );

    if (!setting) {
      throw new AppError("Failed to update Lightning URL setting", 500);
    }

    console.log("✅ Lightning URL updated to:", setting.value);
    return setting.value;
  }
}
