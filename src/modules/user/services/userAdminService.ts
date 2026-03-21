import { User, IUser } from "#src/models/User";
import { AppError } from "#src/utils/AppError";
import { UpdateRoleInput } from "#src/modules/user/validators/userAdminValidators";
import { APIFeatures } from "#src/utils/apiFeatures";

export class AdminUserService {
  static async getAllUsers(query: Record<string, any>): Promise<Partial<IUser>[]> {
    const features = new APIFeatures(
      User.find().select("-password -__v -refreshTokens -otp -otpExpiresAt"),
      query,
    )
      .filter()
      .search(["profile.firstName", "profile.lastName", "email"])
      .sort()
      .paginate();

    return features.query;
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
