import { Request, Response } from "express";
import { AiService } from "#src/modules/ai/services/aiService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AiController {
  static setLightningUrl = catchAsync(async (req: Request, res: Response) => {
    const { url } = req.body;
    const updatedUrl = await AiService.setLightningUrl(url);

    sendSuccess(res, 200, "Lightning URL updated successfully", {
      url: updatedUrl,
    });
  });

  static getLightningUrl = catchAsync(async (_req: Request, res: Response) => {
    const url = await AiService.getLightningUrl();

    sendSuccess(res, 200, "Lightning URL fetched successfully", {
      url,
    });
  });
}
