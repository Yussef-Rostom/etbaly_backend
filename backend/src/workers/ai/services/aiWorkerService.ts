import { Job } from "bullmq";
import axios from "axios";
import FormData from "form-data";
import { AiJobData } from "../../registry";
import { downloadDriveFile, uploadDesignFile } from "#src/utils/drive";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";
import { DesignService } from "#src/modules/design/services/designService";
import fs from "fs";
import path from "path";

export class AiWorkerService {
  /**
   * Calls the Lightning AI service to convert image to STL
   */
  private static async callLightningService(
    imageBuffer: Buffer,
    lightningUrl: string,
    fileName: string,
    correlationId: string
  ): Promise<Buffer> {
    try {
      // Create form data with the image
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: fileName,
        contentType: 'image/jpeg',
      });

      console.log(`[${correlationId}] 🔗 Calling Lightning AI at: ${lightningUrl}/generate`);

      // Send POST request to Lightning AI service
      const response = await axios.post(`${lightningUrl}/generate`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer', // Expect binary STL file
        timeout: 180000, // 3 minute timeout
        maxContentLength: 200 * 1024 * 1024, // 200MB max response
        maxBodyLength: 200 * 1024 * 1024, // 200MB max request
      });

      console.log(`[${correlationId}] ✅ Lightning AI responded with ${response.status}`);

      // Convert response to Buffer
      return Buffer.from(response.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle size limit exceeded
        if (error.message && error.message.includes('maxContentLength')) {
          throw new Error('Lightning AI response too large (exceeds 200MB limit)');
        }
        if (error.message && error.message.includes('maxBodyLength')) {
          throw new Error('Request too large (exceeds 200MB limit)');
        }
        
        // Handle connection errors
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Lightning AI service unreachable at ${lightningUrl}`);
        }
        
        // Handle timeout errors
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new Error('Lightning AI service request timed out after 3 minutes');
        }
        
        // Handle HTTP errors
        if (error.response) {
          throw new Error(
            `Lightning AI service error: ${error.response.status} - ${error.response.statusText}`
          );
        }
      }
      throw new Error(`Lightning AI service call failed: ${error.message}`);
    }
  }

  /**
   * Main AI Worker Implementation with automatic fallback to mock on failure
   */
  static async process(job: Job<AiJobData>) {
    const { fileId, designName, ownerId, correlationId } = job.data;
    
    try {
      // 1. Download file content from Google Drive using fileId (20% progress)
      console.log(`[${correlationId}] 📥 Downloading input file ${fileId}...`);
      const imageBuffer = await downloadDriveFile(fileId);
      await job.updateProgress(20);
      
      // 2. Delegate to resilient processor that handles the real -> mock logic
      return this.processWithFallback(job, imageBuffer);
    } catch (error: any) {
      console.error(`[${correlationId}] ❌ AI Worker critical failure:`, error.message);
      throw error; // Re-throw download errors to allow queue retries
    }
  }

  /**
   * Resilient processor that attempts real AI generation and falls back to local STL mock on any failure.
   */
  private static async processWithFallback(job: Job<AiJobData>, imageBuffer: Buffer) {
    const { designName, ownerId, correlationId } = job.data;
    let stlBuffer: Buffer | null = null;
    let isMock = false;

    // 1. Try to call the real Lightning AI service (60% progress)
    try {
      console.log(`[${correlationId}] 📤 Attempting Lightning AI generation...`);
      const lightningUrl = await AiAdminService.getImageTo3dUrl();
      if (!lightningUrl) throw new Error("Lightning URL not configured.");

      stlBuffer = await this.callLightningService(
        imageBuffer,
        lightningUrl,
        `${designName}.jpg`,
        correlationId
      );
      console.log(`[${correlationId}] ✅ Successfully received AI generated STL`);
      await job.updateProgress(60);
    } catch (error: any) {
      console.error(`[${correlationId}] ⚠️ Lightning AI failed, using local mock: ${error.message}`);
      
      // 2. Fallback: Use the local design.stl mock file
      try {
        const mockPath = path.join(process.cwd(), "src/workers/mocks/design.stl");
        stlBuffer = fs.readFileSync(mockPath);
        isMock = true;
        console.log(`[${correlationId}] 🎭 Loaded local mock STL from ${mockPath}`);
        await job.updateProgress(60);
      } catch (fsError: any) {
        throw new Error(`Critical: Failed to read mock STL file: ${fsError.message}`);
      }
    }

    // 3. Upload Result to Drive (80% progress)
    const finalDesignName = isMock ? `${designName} (Mock)` : designName;
    console.log(`[${correlationId}] ☁️  Uploading STL to Drive...`);
    const uploadResult = await uploadDesignFile(stlBuffer!, `${finalDesignName}.stl`);
    await job.updateProgress(80);

    // 4. Create DB record (100% progress)
    console.log(`[${correlationId}] 📝 Creating Design document...`);
    const design = await DesignService.createDesign(
      finalDesignName,
      uploadResult.publicUrl,
      ownerId
    );
    await job.updateProgress(100);

    console.log(`[${correlationId}] ✅ Process complete. ID: ${design._id}`);

    return {
      success: true,
      designId: design._id.toString(),
      fileId: uploadResult.fileId,
      publicUrl: uploadResult.publicUrl,
      isMock
    };
  }
}
