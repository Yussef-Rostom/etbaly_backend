import { Request, Response } from "express";
import { AdminUserService } from "../services/AdminUserService";
import { catchAsync } from "../../../utils/catchAsync";
import { sendSuccess } from "../../../utils/apiResponse";

export class AdminUserController {
  static getAllUsers = catchAsync(async (_req: Request, res: Response) => {
    const users = await AdminUserService.getAllUsers();

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

    sendSuccess(res, 200, "User role updated successfully.", {
      user: updatedUser,
    });
  });

  static deleteUser = catchAsync(async (req: Request, res: Response) => {
    await AdminUserService.deleteUser(req.params.id as string);

    sendSuccess(res, 200, "User deleted successfully.");
  });
}
