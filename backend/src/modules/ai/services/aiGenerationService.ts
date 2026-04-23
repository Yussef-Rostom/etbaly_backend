import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { AppError } from "#src/utils/AppError";
import { uploadImage } from "#src/utils/drive";

export class AiGenerationService {
  /**
   * Queue a background job to generate a 3D design from an image using Lightning AI service
   */
  static async generateDesignFromImage(
    imageBuffer: Buffer,
    imageName: string,
    designName: string,
    ownerId: string,
    mimeType: string = "image/jpeg"
  ): Promise<{ success: boolean; message: string; jobId: string }> {
    try {
      // 1. Upload the image directly to Google Drive
      const { fileId } = await uploadImage(imageBuffer, imageName, mimeType);

      // 2. Add job to configured AI_GENERATION queue passing only the fileId (no raw buffers)
      const aiQueue = queueManager.getQueue(QUEUE_NAMES.AI_GENERATION);
      const job = await aiQueue.add("generate-design-job", {
        fileId,
        imageName,
        designName,
        ownerId,
        mimeType,
        correlationId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (!job || !job.id) {
        throw new AppError("Failed to add AI generation job to queue", 500);
      }

      // 3. Return 202-style asynchronous response 
      return {
        success: true,
        message: "Job added to queue",
        jobId: job.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("AI generation service queueing error:", error);
      throw new AppError("Failed to queue design generation", 500);
    }
  }

  /**
   * Queue a background job to generate a 3D design from a text prompt using Lightning AI service
   */
  static async generateDesignFromText(
    prompt: string,
    designName: string,
    ownerId: string
  ): Promise<{ success: boolean; message: string; jobId: string }> {
    try {
      // Add job to TEXT_TO_IMAGE queue with prompt, designName, ownerId, and correlationId
      const textQueue = queueManager.getQueue(QUEUE_NAMES.TEXT_TO_IMAGE);
      const job = await textQueue.add("text-to-image-job", {
        prompt,
        designName,
        ownerId,
        correlationId: `text-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      if (!job || !job.id) {
        throw new AppError("Failed to add text-to-image job to queue", 500);
      }

      return {
        success: true,
        message: "Job added to queue",
        jobId: job.id,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Text-to-image service queueing error:", error);
      throw new AppError("Failed to queue text-to-image generation", 500);
    }
  }

  /**
   * Get the status of an AI generation job from a specific queue
   */
  static async getJobStatus(jobId: string, userId: string, queueName: string) {
    try {
      // Validate queue name
      const validQueueNames = [QUEUE_NAMES.AI_GENERATION, QUEUE_NAMES.TEXT_TO_IMAGE];
      if (!validQueueNames.includes(queueName as any)) {
        throw new AppError(
          `Invalid queue name. Must be one of: ${validQueueNames.join(", ")}`,
          400
        );
      }

      // Get job from specified queue
      const queue = queueManager.getQueue(queueName as any);
      const job = await queue.getJob(jobId);

      if (!job) {
        // Job not found in specified queue
        throw new AppError(
          "Job not found. The job may have expired (completed jobs are kept for 1 hour) or the job ID is invalid.",
          404
        );
      }

      // Verify job belongs to the requesting user
      if (job.data.ownerId !== userId) {
        throw new AppError("You do not have permission to view this job", 403);
      }

      const state = await job.getState();
      const progress = job.progress;
      const failedReason = job.failedReason;

      // Base response
      const response: any = {
        jobId: job.id,
        queueName,
        state,
        progress,
        designName: job.data.designName,
        createdAt: job.timestamp,
      };

      // Add state-specific information
      switch (state) {
        case "completed":
          const result = job.returnvalue;
          response.completed = true;
          
          // Different result structure based on queue type
          if (queueName === QUEUE_NAMES.TEXT_TO_IMAGE) {
            response.result = {
              success: result?.success || false,
              imageFileId: result?.imageFileId,
              imagePublicUrl: result?.imagePublicUrl,
            };
          } else {
            response.result = {
              success: result?.success || false,
              designId: result?.designId,
              fileId: result?.fileId,
              publicUrl: result?.publicUrl,
              isMock: result?.isMock || false,
            };
          }
          break;

        case "failed":
          response.completed = false;
          response.failed = true;
          response.error = failedReason || "Job failed";
          break;

        case "active":
          response.completed = false;
          response.processing = true;
          break;

        case "waiting":
        case "delayed":
          response.completed = false;
          response.waiting = true;
          break;

        default:
          response.completed = false;
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Error fetching job status:", error);
      throw new AppError("Failed to fetch job status", 500);
    }
  }
}
