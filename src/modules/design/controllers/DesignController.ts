import { Request, Response } from "express";
import { DesignService } from "#src/modules/design/services/DesignService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { AppError } from "#src/utils/AppError";

export class DesignController {
  static uploadDesignFile = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("Design file is required.", 400);
    }

    const fileUrl = await DesignService.uploadDesignFile(req.file);

    sendSuccess(res, 200, "Design file uploaded successfully", { fileUrl });
  });

  static createDesign = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const design = await DesignService.createDesign(userId, req.body);

    sendSuccess(res, 201, "Design created successfully", { design });
  });

  static getDesigns = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const { role } = req.user;
    const designs = await DesignService.getDesigns(userId, role);

    sendSuccess(res, 200, "Designs fetched successfully", { designs });
  });

  static getDesignById = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const { role } = req.user;
    const design = await DesignService.getDesignById(userId, role, req.params.id as string);

    sendSuccess(res, 200, "Design fetched successfully", { design });
  });

  static updateDesign = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const { role } = req.user;
    const design = await DesignService.updateDesign(userId, role, req.params.id as string, req.body);

    sendSuccess(res, 200, "Design updated successfully", { design });
  });

  static deleteDesign = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user._id.toString();
    const { role } = req.user;
    await DesignService.deleteDesign(userId, role, req.params.id as string);

    sendSuccess(res, 200, "Design deleted successfully");
  });
}
