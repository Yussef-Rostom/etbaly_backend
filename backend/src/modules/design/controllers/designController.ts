import { Request, Response } from "express";
import { DesignService } from "#src/modules/design/services/designService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { getAuthUser } from "#src/middlewares/authMiddleware";
import { AppError } from "#src/utils/AppError";

export class DesignController {
  /**
   * POST /api/v1/designs/upload
   * Uploads a design file to Drive and returns its public URL.
   */
  static uploadDesign = catchAsync(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new AppError("Design file is required.", 400);
    }

    const { fileUrl, fileId } = await DesignService.uploadDesign(file);

    sendSuccess(res, 201, "Design file uploaded successfully.", { fileUrl, fileId });
  });

  static getAll = catchAsync(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const designs = await DesignService.getDesigns(
      user._id.toString(),
      user.role,
    );

    sendSuccess(res, 200, "Designs fetched successfully", { designs });
  });

  static getOne = catchAsync(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const design = await DesignService.getDesignById(
      user._id.toString(),
      user.role,
      req.params.id as string,
    );

    sendSuccess(res, 200, "Design fetched successfully", { design });
  });
}
