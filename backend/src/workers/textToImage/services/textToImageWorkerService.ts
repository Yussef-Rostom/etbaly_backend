// src/workers/textToImage/services/textToImageWorkerService.ts
import { Job } from "bullmq";
import axios from "axios";
import { TextToImageJobData } from "../types";
import { uploadImage } from "#src/utils/drive";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";
import fs from "fs";
import path from "path";

export class TextToImageWorkerService {
  /**
   * Calls the Lightning AI text-to-image service to convert text prompt to image
   */
  private static async callLightningService(
    prompt: string,
    lightningUrl: string,
    correlationId: string
  ): Promise<Buffer> {
    try {
      // Send POST request to Lightning AI text-to-image service
      const response = await axios.post(
        `${lightningUrl}/generate-image`,
        { prompt },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 minute timeout
          maxContentLength: 50 * 1024 * 1024, // 50MB max response
          maxBodyLength: 50 * 1024 * 1024, // 50MB max request
        }
      );

      // Handle base64-encoded response
      if (typeof response.data === 'object' && response.data !== null && response.data.image_base64) {
        const base64Data = response.data.image_base64;
        
        if (typeof base64Data === 'string') {
          // Strip data URL prefix if present (e.g., "data:image/png;base64,")
          const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
          return Buffer.from(base64String, 'base64');
        }
        
        throw new Error('Lightning AI response image_base64 field is not a string');
      }
      
      // If no image_base64 field found, throw error
      if (typeof response.data === 'object' && response.data !== null) {
        throw new Error('Lightning AI response is missing image_base64 field');
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
   * Main TEXT_TO_IMAGE Worker Implementation with automatic fallback to mock on failure
   */
  static async process(job: Job<TextToImageJobData>) {
    const { prompt, designName, correlationId } = job.data;
    
    try {
      await job.updateProgress(20);
      
      // Delegate to resilient processor that handles the real -> mock logic
      return this.processWithFallback(job, prompt, designName);
    } catch (error: any) {
      console.error(`[${correlationId}] ❌ Text-to-image worker critical failure:`, error.message);
      throw error; // Re-throw to allow queue retries
    }
  }

  /**
   * Resilient processor that attempts real AI generation and falls back to local mock image on any failure.
   */
  private static async processWithFallback(
    job: Job<TextToImageJobData>,
    prompt: string,
    designName: string
  ) {
    const { correlationId } = job.data;
    let imageBuffer: Buffer | null = null;
    let isMock = false;

    // 1. Try to call the real Lightning AI service (60% progress)
    try {
      const lightningUrl = await AiAdminService.getTextToImageUrl();
      if (!lightningUrl) throw new Error("Text-to-image Lightning URL not configured.");

      imageBuffer = await this.callLightningService(
        prompt,
        lightningUrl,
        correlationId
      );
      await job.updateProgress(60);
    } catch (error: any) {
      console.error(`[${correlationId}] ⚠️ Lightning AI failed, using local mock: ${error.message}`);
      
      // 2. Fallback: Use a local mock image file
      try {
        const mockPath = path.join(process.cwd(), "../tmp/image/imageMock.png");
        imageBuffer = fs.readFileSync(mockPath);
        isMock = true;
        await job.updateProgress(60);
      } catch (fsError: any) {
        throw new Error(`Critical: Failed to read mock image file: ${fsError.message}`);
      }
    }

    // 3. Upload Result to Drive (80% progress)
    const finalDesignName = isMock ? `${designName} (Mock)` : designName;
    const { fileId, publicUrl } = await uploadImage(
      imageBuffer!,
      `${finalDesignName}-generated.png`,
      "image/png"
    );
    await job.updateProgress(80);

    await job.updateProgress(100);

    return {
      success: true,
      imageFileId: fileId,
      imagePublicUrl: publicUrl,
      isMock
    };
  }
}
