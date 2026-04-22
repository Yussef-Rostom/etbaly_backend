// src/workers/textToImage/services/textToImageWorkerService.ts
import { Job } from "bullmq";
import axios from "axios";
import { TextToImageJobData } from "../types";
import { uploadImage } from "#src/utils/drive";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";

export class TextToImageWorkerService {
  /**
   * Calls the Lightning AI text-to-image service to convert text prompt to image
   */
  private static async callLightningTextToImageService(
    prompt: string,
    lightningUrl: string,
    correlationId: string
  ): Promise<Buffer> {
    try {
      console.log(`[${correlationId}] 🔗 Calling Lightning AI text-to-image at: ${lightningUrl}/generate`);

      // Send POST request to Lightning AI text-to-image service
      const response = await axios.post(
        `${lightningUrl}/generate-image`,
        { prompt },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 180000, // 3 minute timeout
          maxContentLength: 50 * 1024 * 1024, // 50MB max response
          maxBodyLength: 50 * 1024 * 1024, // 50MB max request
        }
      );

      console.log(`[${correlationId}] ✅ Lightning AI text-to-image responded with ${response.status}`);

      // Handle base64-encoded response
      if (typeof response.data === 'object' && response.data !== null) {
        // Check for base64 data in common response fields
        let base64Data: string | undefined;
        
        if (response.data.image_base64) {
          base64Data = response.data.image_base64;
        } else if (response.data.image) {
          base64Data = response.data.image;
        } else if (response.data.data) {
          base64Data = response.data.data;
        } else if (response.data.base64) {
          base64Data = response.data.base64;
        }

        if (base64Data && typeof base64Data === 'string') {
          // Strip data URL prefix if present (e.g., "data:image/png;base64,")
          const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
          console.log(`[${correlationId}] 🔄 Converting base64 response to buffer`);
          return Buffer.from(base64String, 'base64');
        }
        
        // If object but no base64 field found, throw error
        throw new Error('Lightning AI response is JSON but missing expected base64 image field (image_base64, image, data, or base64)');
      }

      // Fallback: treat response as binary data (Buffer or ArrayBuffer)
      return Buffer.from(response.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle size limit exceeded
        if (error.message && error.message.includes('maxContentLength')) {
          throw new Error('Lightning AI response too large (exceeds 50MB limit)');
        }
        if (error.message && error.message.includes('maxBodyLength')) {
          throw new Error('Request too large (exceeds 50MB limit)');
        }
        
        // Handle connection errors
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Lightning AI text-to-image service unreachable at ${lightningUrl}`);
        }
        
        // Handle timeout errors
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new Error('Lightning AI text-to-image service request timed out after 3 minutes');
        }
        
        // Handle HTTP errors
        if (error.response) {
          throw new Error(
            `Lightning AI text-to-image service error: ${error.response.status} - ${error.response.statusText}`
          );
        }
      }
      throw new Error(`Lightning AI text-to-image service call failed: ${error.message}`);
    }
  }

  /**
   * Main TEXT_TO_IMAGE Worker Implementation
   * Processes text-to-image jobs and returns the generated image
   */
  static async process(job: Job<TextToImageJobData>) {
    const { prompt, designName, ownerId, correlationId } = job.data;
    
    try {
      // 1. Get text-to-image URL from settings (33% progress)
      console.log(`[${correlationId}] 📋 Retrieving text-to-image Lightning AI URL...`);
      const textToImageUrl = await AiAdminService.getTextToImageUrl();
      
      if (!textToImageUrl) {
        throw new Error("Text-to-image Lightning AI URL is not configured");
      }
      
      await job.updateProgress(33);

      // 2. Call Lightning AI text-to-image service (66% progress)
      console.log(`[${correlationId}] 🎨 Generating image from text prompt...`);
      const imageBuffer = await this.callLightningTextToImageService(
        prompt,
        textToImageUrl,
        correlationId
      );
      
      await job.updateProgress(66);

      // 3. Upload generated image to Google Drive (100% progress)
      console.log(`[${correlationId}] ☁️  Uploading generated image to Drive...`);
      const { fileId, publicUrl } = await uploadImage(
        imageBuffer,
        `${designName}-generated.png`,
        "image/png"
      );
      
      await job.updateProgress(100);

      console.log(`[${correlationId}] ✅ Text-to-image process complete. Image available at ${publicUrl}`);

      return {
        success: true,
        imageFileId: fileId,
        imagePublicUrl: publicUrl,
      };
    } catch (error: any) {
      console.error(`[${correlationId}] ❌ Text-to-image worker failed:`, error.message);
      throw error; // Re-throw to allow queue retries
    }
  }
}
