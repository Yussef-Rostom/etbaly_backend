import { Request, Response } from "express";
import { DesignService } from "#src/modules/design/services/DesignService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { getAuthUser } from "#src/middlewares/authMiddleware";

export class DesignController {
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
