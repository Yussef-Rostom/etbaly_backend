import Settings from "#src/models/Settings";
import { redisCache } from "#src/utils/redisCache";
import { AppError } from "#src/utils/AppError";

export class AiAdminService {
  private static readonly LIGHTNING_URL_KEY = "lightningAiUrl";
  private static readonly TEXT_TO_IMAGE_URL_KEY = "lightningAiTextToImageUrl";
  private static readonly TEXT_TO_IMAGE_CACHE_KEY = "settings:lightning_text_to_image_url";
  private static readonly IMAGE_TO_3D_URL_KEY = "lightningAiImageTo3dUrl";
  private static readonly IMAGE_TO_3D_CACHE_KEY = "settings:lightning_image_to_3d_url";
  private static readonly CACHE_TTL = 3600; // 1 hour in seconds

  /**
   * Get the text-to-image Lightning AI service URL with Redis caching.
   * Priority: Redis Cache -> Database
   * Throws error if URL is not configured.
   */
  static async getTextToImageUrl(): Promise<string> {
    try {
      // 1. Try Redis cache first
      const cachedUrl = await redisCache.get(this.TEXT_TO_IMAGE_CACHE_KEY);
      if (cachedUrl) {
        console.log("✅ Text-to-image URL fetched from Redis cache");
        return cachedUrl;
      }

      // 2. Try database
      const setting = await Settings.findOne({ key: this.TEXT_TO_IMAGE_URL_KEY });
      
      if (setting && setting.value) {
        // Cache in Redis for future requests
        await redisCache.set(this.TEXT_TO_IMAGE_CACHE_KEY, setting.value, this.CACHE_TTL);
        console.log("✅ Text-to-image URL fetched from database and cached");
        return setting.value;
      }
      
      // 3. No URL configured - throw error
      throw new AppError(
        "Text-to-image Lightning AI URL is not configured. Please set it via the admin API endpoint: POST /api/v1/admin/ai/set-text-to-image-url",
        500
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("❌ Error fetching text-to-image URL:", error);
      throw new AppError("Failed to fetch text-to-image Lightning AI URL from database", 500);
    }
  }

  /**
   * Set the text-to-image Lightning AI service URL in database and update Redis cache.
   * Creates or updates the setting.
   */
  static async setTextToImageUrl(url: string): Promise<string> {
    try {
      // Remove trailing slash if present
      const cleanUrl = url.replace(/\/+$/, '');

      const setting = await Settings.findOneAndUpdate(
        { key: this.TEXT_TO_IMAGE_URL_KEY },
        { 
          value: cleanUrl,
          description: "Lightning AI service endpoint URL for text-to-image generation"
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      // Update Redis cache
      await redisCache.set(this.TEXT_TO_IMAGE_CACHE_KEY, setting.value, this.CACHE_TTL);

      console.log("✅ Text-to-image URL updated in database and Redis cache:", setting.value);
      return setting.value;
    } catch (error) {
      console.error("❌ Error updating text-to-image URL:", error);
      throw error;
    }
  }

  /**
   * Clear the text-to-image URL cache (useful for testing or manual cache invalidation)
   */
  static async clearTextToImageUrlCache(): Promise<void> {
    try {
      await redisCache.del(this.TEXT_TO_IMAGE_CACHE_KEY);
      console.log("✅ Text-to-image URL cache cleared");
    } catch (error) {
      console.error("❌ Error clearing text-to-image URL cache:", error);
    }
  }

  /**
   * Get the image-to-3D Lightning AI service URL with Redis caching.
   * Priority: Redis Cache -> Database (new key) -> Database (legacy key)
   * Throws error if URL is not configured.
   */
  static async getImageTo3dUrl(): Promise<string> {
    try {
      // 1. Try Redis cache first
      const cachedUrl = await redisCache.get(this.IMAGE_TO_3D_CACHE_KEY);
      if (cachedUrl) {
        console.log("✅ Image-to-3D URL fetched from Redis cache");
        return cachedUrl;
      }

      // 2. Try database with new key
      let setting = await Settings.findOne({ key: this.IMAGE_TO_3D_URL_KEY });
      
      if (setting && setting.value) {
        // Cache in Redis for future requests
        await redisCache.set(this.IMAGE_TO_3D_CACHE_KEY, setting.value, this.CACHE_TTL);
        console.log("✅ Image-to-3D URL fetched from database and cached");
        return setting.value;
      }

      // 3. Fallback to legacy key for backward compatibility
      setting = await Settings.findOne({ key: this.LIGHTNING_URL_KEY });
      
      if (setting && setting.value) {
        // Cache in Redis for future requests
        await redisCache.set(this.IMAGE_TO_3D_CACHE_KEY, setting.value, this.CACHE_TTL);
        console.log("✅ Image-to-3D URL fetched from legacy key and cached");
        return setting.value;
      }
      
      // 4. No URL configured - throw error
      throw new AppError(
        "Image-to-3D Lightning AI URL is not configured. Please set it via the admin API endpoint: POST /api/v1/admin/ai/set-image-to-3d-url",
        500
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("❌ Error fetching image-to-3D URL:", error);
      throw new AppError("Failed to fetch image-to-3D Lightning AI URL from database", 500);
    }
  }

  /**
   * Set the image-to-3D Lightning AI service URL in database and update Redis cache.
   * Creates or updates the setting.
   */
  static async setImageTo3dUrl(url: string): Promise<string> {
    try {
      // Remove trailing slash if present
      const cleanUrl = url.replace(/\/+$/, '');

      const setting = await Settings.findOneAndUpdate(
        { key: this.IMAGE_TO_3D_URL_KEY },
        { 
          value: cleanUrl,
          description: "Lightning AI service endpoint URL for image-to-3D conversion"
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      // Update Redis cache
      await redisCache.set(this.IMAGE_TO_3D_CACHE_KEY, setting.value, this.CACHE_TTL);

      console.log("✅ Image-to-3D URL updated in database and Redis cache:", setting.value);
      return setting.value;
    } catch (error) {
      console.error("❌ Error updating image-to-3D URL:", error);
      throw error;
    }
  }

  /**
   * Clear the image-to-3D URL cache (useful for testing or manual cache invalidation)
   */
  static async clearImageTo3dUrlCache(): Promise<void> {
    try {
      await redisCache.del(this.IMAGE_TO_3D_CACHE_KEY);
      console.log("✅ Image-to-3D URL cache cleared");
    } catch (error) {
      console.error("❌ Error clearing image-to-3D URL cache:", error);
    }
  }
}
