import { Request, Response } from "express";
import { AdminUserService } from "#src/modules/user/services/userAdminService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { getAuthUser } from "#src/middlewares/authMiddleware";
import { AppError } from "#src/utils/AppError";

export class AdminUserController {
  static getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const users = await AdminUserService.getAllUsers(req.query);

    sendSuccess(res, 200, "Users fetched successfully", {
      results: users.length,
      users,
    });
  });

  static updateUserRole = catchAsync(async (req: Request, res: Response) => {
    if (req.params.id === getAuthUser(req)._id.toString()) {
      throw new AppError("You cannot change your own role.", 403);
    }

    const updatedUser = await AdminUserService.updateUserRole(
      req.params.id as string,
      req.body,
    );

    sendSuccess(res, 200, "User role updated successfully.", { user: updatedUser });
  });

  static deleteUser = catchAsync(async (req: Request, res: Response) => {
    if (req.params.id === getAuthUser(req)._id.toString()) {
      throw new AppError("You cannot delete your own account.", 403);
    }

    await AdminUserService.deleteUser(req.params.id as string);

    sendSuccess(res, 200, "User deleted successfully.");
  });
}
