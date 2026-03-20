import { Request, Response } from "express";
import { DesignAdminService } from "#src/modules/design/services/DesignAdminService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { AppError } from "#src/utils/AppError";

export class DesignAdminController {
  static uploadFile = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError("Design file is required.", 400);

    const fileUrl = await DesignAdminService.uploadDesignFile(req.file);

    sendSuccess(res, 200, "Design file uploaded successfully", { fileUrl });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const design = await DesignAdminService.createDesign(
      req.user._id.toString(),
      req.body,
    );

    sendSuccess(res, 201, "Design created successfully", { design });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const design = await DesignAdminService.updateDesign(
      req.params.id as string,
      req.body,
      req.user?._id.toString(),
      req.user?.role,
    );

    sendSuccess(res, 200, "Design updated successfully", { design });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    await DesignAdminService.deleteDesign(
      req.params.id as string,
      req.user?._id.toString(),
      req.user?.role,
    );

    sendSuccess(res, 200, "Design deleted successfully");
  });
}
