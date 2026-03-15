import { Request, Response } from "express";
import { AuthService } from "#src/modules/auth/services/AuthService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AuthController {
  static register = catchAsync(async (req: Request, res: Response) => {
    const { message, user } = await AuthService.register(req.body);

    sendSuccess(res, 201, message, { user });
  });

  static login = catchAsync(async (req: Request, res: Response) => {
    const { message, user, accessToken, refreshToken } =
      await AuthService.login(req.body);

    sendSuccess(res, 200, message, {
      user,
      accessToken,
      refreshToken,
    });
  });

  static googleAuth = catchAsync(async (req: Request, res: Response) => {
    const { message, user, accessToken, refreshToken } =
      await AuthService.googleAuth(req.body);

    sendSuccess(res, 200, message, {
      user,
      accessToken,
      refreshToken,
    });
  });

  static verifyOtp = catchAsync(async (req: Request, res: Response) => {
    const { message, user, accessToken, refreshToken } =
      await AuthService.verifyOtp(req.body);

    sendSuccess(res, 200, message, {
      user,
      accessToken,
      refreshToken,
    });
  });

  static forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const { message } = await AuthService.forgotPassword(req.body);

    sendSuccess(res, 200, message, null);
  });

  static resetPassword = catchAsync(async (req: Request, res: Response) => {
    const { message } = await AuthService.resetPassword(req.body);

    sendSuccess(res, 200, message, null);
  });

  static refreshToken = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const {
      message,
      accessToken,
      refreshToken: newRefreshToken,
    } = await AuthService.refreshToken(refreshToken);

    sendSuccess(res, 200, message, {
      accessToken,
      refreshToken: newRefreshToken,
    });
  });

  static logout = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const { message } = await AuthService.logout(refreshToken);

    sendSuccess(res, 200, message, null);
  });
}
