import { Request, Response } from "express";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AiAdminController {
  static setLightningUrl = catchAsync(async (req: Request, res: Response) => {
    const { url } = req.body;
    const updatedUrl = await AiAdminService.setLightningUrl(url);

    sendSuccess(res, 200, "Lightning URL updated successfully", {
      url: updatedUrl,
    });
  });

  static getLightningUrl = catchAsync(async (_req: Request, res: Response) => {
    const url = await AiAdminService.getLightningUrl();

    sendSuccess(res, 200, "Lightning URL fetched successfully", {
      url,
    });
  });
}
