import { Request, Response } from "express";
import { AiGenerationService } from "#src/modules/ai/services/aiGenerationService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { AppError } from "#src/utils/AppError";

export class AiGenerationController {
  static generateDesignFromImage = catchAsync(async (req: Request, res: Response) => {
    const file = req.file;
    const { designName } = req.body;
    const userId = req.user?._id;

    if (!file) {
      throw new AppError("Image file is required", 400);
    }

    if (!designName) {
      throw new AppError("Design name is required", 400);
    }

    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const result = await AiGenerationService.generateDesignFromImage(
      file.buffer,
      file.originalname,
      designName,
      userId.toString(),
      file.mimetype
    );

    sendSuccess(res, 201, "Design generated successfully from image", result);
  });
}
