import { processAiGenerationJob } from "#src/jobs/workers";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";
import { AppError } from "#src/utils/AppError";

export class AiGenerationService {
  /**
   * Generate a 3D design from an image using Lightning AI service
   */
  static async generateDesignFromImage(
    imageBuffer: Buffer,
    imageName: string,
    designName: string,
    ownerId: string,
    mimeType: string = "image/jpeg"
  ): Promise<{ designId: string; fileUrl: string }> {
    try {
      // Verify Lightning URL is configured
      const lightningUrl = await AiAdminService.getLightningUrl();
      
      if (!lightningUrl) {
        throw new AppError(
          "Lightning AI service URL is not configured. Please contact an administrator.",
          500
        );
      }

      const result = await processAiGenerationJob({
        imageBuffer,
        imageName,
        designName,
        ownerId,
        mimeType,
      });

      if (!result || !result.success) {
        throw new AppError("AI generation failed", 500);
      }

      return {
        designId: result.designId,
        fileUrl: result.fileUrl,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("AI generation service error:", error);
      throw new AppError("Failed to generate design from image", 500);
    }
  }
}
