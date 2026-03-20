import { Request, Response } from "express";
import { UserService } from "#src/modules/user/services/UserService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess, sendError } from "#src/utils/apiResponse";
import { getAuthUser } from "#src/middlewares/authMiddleware";

export class UserController {
  static getMe = catchAsync(async (req: Request, res: Response) => {
    const user = await UserService.getProfile(getAuthUser(req)._id.toString());

    sendSuccess(res, 200, "Profile fetched successfully", {
      user,
    });
  });

  static updateMe = catchAsync(async (req: Request, res: Response) => {
    const updatedUser = await UserService.updateProfile(
      getAuthUser(req)._id.toString(),
      req.body,
    );

    sendSuccess(res, 200, "Profile updated successfully.", {
      user: updatedUser,
    });
  });

  static changePassword = catchAsync(async (req: Request, res: Response) => {
    await UserService.changePassword(getAuthUser(req)._id.toString(), req.body);

    sendSuccess(
      res,
      200,
      "Password changed successfully. Please log in again if necessary.",
    );
  });

  static uploadAvatar = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      return sendError(res, 400, "Please upload an image file.");
    }

    const avatarUrl = await UserService.uploadAvatar(
      getAuthUser(req)._id.toString(),
      req.file.buffer,
      req.file.mimetype,
    );

    sendSuccess(res, 200, "Avatar uploaded successfully.", {
      avatarUrl,
    });
  });
}
