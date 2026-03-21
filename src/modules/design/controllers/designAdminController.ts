import { Request, Response } from "express";
import { DesignAdminService } from "#src/modules/design/services/designAdminService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { AppError } from "#src/utils/AppError";
import { getAuthUser } from "#src/middlewares/authMiddleware";

export class DesignAdminController {
  static uploadFile = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError("Design file is required.", 400);

    const fileUrl = await DesignAdminService.uploadDesignFile(req.file);

    sendSuccess(res, 200, "Design file uploaded successfully", { fileUrl });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const design = await DesignAdminService.createDesign(
      user._id.toString(),
      req.body,
    );

    sendSuccess(res, 201, "Design created successfully", { design });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    const design = await DesignAdminService.updateDesign(
      req.params.id as string,
      req.body,
      user._id.toString(),
      user.role,
    );

    sendSuccess(res, 200, "Design updated successfully", { design });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const user = getAuthUser(req);
    await DesignAdminService.deleteDesign(
      req.params.id as string,
      user._id.toString(),
      user.role,
    );

    sendSuccess(res, 200, "Design deleted successfully");
  });
}
