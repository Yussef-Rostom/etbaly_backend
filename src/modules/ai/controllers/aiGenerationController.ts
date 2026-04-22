import { Request, Response } from "express";
import { AiGenerationService } from "#src/modules/ai/services/aiGenerationService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AiGenerationController {
  /**
   * Generate 3D design from image
   */
  static generateDesignFromImage = catchAsync(async (req: Request, res: Response) => {
    const file = req.file;
    const { designName } = req.body;
    const userId = req.user!._id;

    const result = await AiGenerationService.generateDesignFromImage(
      file!.buffer,
      file!.originalname,
      designName,
      userId.toString(),
      file!.mimetype
    );

    sendSuccess(res, 201, "3D design generation job queued", result);
  });

  /**
   * Generate image from text prompt
   */
  static generateImageFromText = catchAsync(async (req: Request, res: Response) => {
    const { designName, prompt } = req.body;
    const userId = req.user!._id;

    const result = await AiGenerationService.generateDesignFromText(
      prompt,
      designName,
      userId.toString()
    );

    sendSuccess(res, 201, "Image generation job queued", result);
  });

  static getJobStatus = catchAsync(async (req: Request, res: Response) => {
    const { jobId, queueName } = req.params;
    const userId = req.user!._id;

    // Ensure parameters are strings (Express params can be string | string[])
    const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;
    const queueNameStr = Array.isArray(queueName) ? queueName[0] : queueName;

    const status = await AiGenerationService.getJobStatus(
      jobIdStr, 
      userId.toString(),
      queueNameStr
    );

    sendSuccess(res, 200, "Job status retrieved successfully", status);
  });
}
