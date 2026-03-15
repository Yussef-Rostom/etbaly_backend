import { User, IUser } from "@/models/User";
import { AppError } from "@/utils/AppError";
import { UpdateRoleInput } from "@/modules/admin/validators/adminUserValidators";

export class AdminUserService {
  static async getAllUsers(): Promise<Partial<IUser>[]> {
    const users = await User.find().select(
      "-password -__v -refreshTokens -otp -otpExpiresAt",
    );
    return users;
  }

  static async updateUserRole(
    userId: string,
    data: UpdateRoleInput,
  ): Promise<Partial<IUser>> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    user.role = data.role;
    // Invalidate refresh tokens so user is forced to re-login with new permissions
    user.refreshTokens = [];
    await user.save();

    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      isVerified: user.isVerified,
    };
  }

  static async deleteUser(userId: string): Promise<void> {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }
  }
}
