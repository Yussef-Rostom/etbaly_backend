import { Request, Response } from "express";
import { AiAdminService } from "#src/modules/ai/services/aiAdminService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AiAdminController {
  // Text-to-image URL endpoints
  static setTextToImageUrl = catchAsync(async (req: Request, res: Response) => {
    const { url } = req.body;
    const updatedUrl = await AiAdminService.setTextToImageUrl(url);

    sendSuccess(res, 200, "Text-to-image URL updated successfully", {
      url: updatedUrl,
    });
  });

  static getTextToImageUrl = catchAsync(async (_req: Request, res: Response) => {
    const url = await AiAdminService.getTextToImageUrl();

    sendSuccess(res, 200, "Text-to-image URL fetched successfully", {
      url,
    });
  });

  static clearTextToImageUrlCache = catchAsync(async (_req: Request, res: Response) => {
    await AiAdminService.clearTextToImageUrlCache();

    sendSuccess(res, 200, "Text-to-image URL cache cleared successfully");
  });

  // Image-to-3D URL endpoints
  static setImageTo3dUrl = catchAsync(async (req: Request, res: Response) => {
    const { url } = req.body;
    const updatedUrl = await AiAdminService.setImageTo3dUrl(url);

    sendSuccess(res, 200, "Image-to-3D URL updated successfully", {
      url: updatedUrl,
    });
  });

  static getImageTo3dUrl = catchAsync(async (_req: Request, res: Response) => {
    const url = await AiAdminService.getImageTo3dUrl();

    sendSuccess(res, 200, "Image-to-3D URL fetched successfully", {
      url,
    });
  });

  static clearImageTo3dUrlCache = catchAsync(async (_req: Request, res: Response) => {
    await AiAdminService.clearImageTo3dUrlCache();

    sendSuccess(res, 200, "Image-to-3D URL cache cleared successfully");
  });
}
