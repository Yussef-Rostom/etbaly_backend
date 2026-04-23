// src/migrations/migrateLightningAiUrls.ts
import Settings from "#src/models/Settings";

/**
 * Migrates the legacy "lightningAiUrl" setting to the new "lightningAiImageTo3dUrl" setting.
 * 
 * This migration ensures backward compatibility when upgrading from single-URL to dual-URL
 * configuration for Lightning AI services (text-to-image and image-to-3D).
 * 
 * Migration Logic:
 * 1. Check if "lightningAiUrl" exists in Settings
 * 2. If exists and "lightningAiImageTo3dUrl" does not exist, copy value to "lightningAiImageTo3dUrl"
 * 3. Preserve original "lightningAiUrl" for backward compatibility
 * 
 * @returns Promise<void>
 */
export async function migrateLightningAiUrls(): Promise<void> {
  try {
    console.log("🔄 Running Lightning AI URL migration...");

    // Check if legacy "lightningAiUrl" exists
    const legacyUrlSetting = await Settings.findOne({ key: "lightningAiUrl" });

    if (!legacyUrlSetting) {
      console.log("✅ Migration skipped: No legacy 'lightningAiUrl' found");
      return;
    }

    console.log(`📋 Found legacy 'lightningAiUrl': ${legacyUrlSetting.value}`);

    // Check if new "lightningAiImageTo3dUrl" already exists
    const newUrlSetting = await Settings.findOne({ key: "lightningAiImageTo3dUrl" });

    if (newUrlSetting) {
      console.log("✅ Migration skipped: 'lightningAiImageTo3dUrl' already exists");
      return;
    }

    // Copy legacy URL to new setting
    await Settings.create({
      key: "lightningAiImageTo3dUrl",
      value: legacyUrlSetting.value,
      description: "Lightning AI service endpoint for image-to-3D conversion (migrated from lightningAiUrl)",
    });

    console.log("✅ Migration completed: Copied 'lightningAiUrl' to 'lightningAiImageTo3dUrl'");
    console.log("📝 Original 'lightningAiUrl' preserved for backward compatibility");
  } catch (error) {
    console.error("❌ Lightning AI URL migration failed:", error);
    // Don't throw - allow application to start even if migration fails
    // The fallback logic in AiAdminService will handle missing settings
  }
}
