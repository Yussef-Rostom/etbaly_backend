import Settings from "#src/models/Settings";

export class AiService {
  private static readonly LIGHTNING_URL_KEY = "LIGHTNING_URL";

  /**
   * Get the Lightning AI service URL from database.
   */
  static async getLightningUrl(): Promise<string> {
    const setting = await Settings.findOne({ key: this.LIGHTNING_URL_KEY });
    return setting?.value || "";
  }

  /**
   * Set the Lightning AI service URL in database.
   * Creates or updates the setting.
   */
  static async setLightningUrl(url: string): Promise<string> {
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
  }
}
