import { User, IUser } from "#src/models/User";
import { AppError } from "#src/utils/AppError";
import { uploadImage } from "#src/utils/cloudinary";
import { UpdateProfileInput, ChangePasswordInput } from "#src/modules/user/validators/userValidators";

export class UserService {
  /** Retrieves a user's full profile information. */
  static async getProfile(userId: string): Promise<Partial<IUser>> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      savedAddresses: user.savedAddresses,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** Updates specific fields in a user's profile. */
  static async updateProfile(
    userId: string,
    data: UpdateProfileInput,
  ): Promise<Partial<IUser>> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    if (data.firstName !== undefined) user.profile.firstName = data.firstName;
    if (data.lastName !== undefined) user.profile.lastName = data.lastName;
    if (data.phoneNumber !== undefined)
      user.profile.phoneNumber = data.phoneNumber;
    if (data.avatarUrl !== undefined) user.profile.avatarUrl = data.avatarUrl;
    if (data.savedAddresses !== undefined)
      user.savedAddresses = data.savedAddresses;

    await user.save();

    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      savedAddresses: user.savedAddresses,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** Changes a user's password and revokes all active sessions. */
  static async changePassword(
    userId: string,
    data: ChangePasswordInput,
  ): Promise<void> {
    const user = await User.findById(userId).select("+password +refreshTokens");
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    const isMatch = await user.comparePassword(data.currentPassword);
    if (!isMatch) {
      throw new AppError("Incorrect current password.", 401);
    }

    user.password = data.newPassword;
    // Force re-login on all devices
    user.refreshTokens = [];

    await user.save();
  }

  /** Uploads a new avatar image to Cloudinary and updates the user's profile. */
  static async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    const avatarUrl = await uploadImage(fileBuffer, `etbaly/avatars/${userId}`);

    user.profile.avatarUrl = avatarUrl;
    await user.save();

    return avatarUrl;
  }
}
