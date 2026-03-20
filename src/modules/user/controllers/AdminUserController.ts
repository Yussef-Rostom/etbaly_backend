import { Request, Response } from "express";
import { AdminUserService } from "#src/modules/user/services/AdminUserService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AdminUserController {
  static getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const users = await AdminUserService.getAllUsers(req.query);

    sendSuccess(res, 200, "Users fetched successfully", {
      results: users.length,
      users,
    });
  });

  static updateUserRole = catchAsync(async (req: Request, res: Response) => {
    const updatedUser = await AdminUserService.updateUserRole(
      req.params.id as string,
      req.body,
    );

    sendSuccess(res, 200, "User role updated successfully.", { user: updatedUser });
  });

  static deleteUser = catchAsync(async (req: Request, res: Response) => {
    await AdminUserService.deleteUser(req.params.id as string);

    sendSuccess(res, 200, "User deleted successfully.");
  });
}
