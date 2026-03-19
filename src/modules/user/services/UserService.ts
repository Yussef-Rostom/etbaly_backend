import { User, IUser } from "#src/models/User";
import { Upload } from "#src/models/Upload";
import { AppError } from "#src/utils/AppError";
import { uploadAvatarImage, deleteDriveFile } from "#src/utils/drive";
import { UpdateProfileInput, ChangePasswordInput } from "#src/modules/user/validators/userValidators";

const safeProfileOf = (profile: IUser["profile"]) => {
  const { avatarDriveFileId: _, ...safe } = { ...profile };
  return safe;
};

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
      profile: safeProfileOf(user.profile),
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
      profile: safeProfileOf(user.profile),
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

  /** Uploads a new avatar image to Google Drive and updates the user's profile. */
  static async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    const { fileId, publicUrl } = await uploadAvatarImage(
      fileBuffer,
      `avatar-${userId}-${Date.now()}.jpg`,
      mimeType,
    );

    // Track the new upload as unused until saved to the user
    await Upload.findOneAndUpdate(
      { driveFileId: fileId },
      { driveFileId: fileId, fileUrl: publicUrl, is_used: false },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Delete old avatar from Drive and remove its Upload tracker
    if (user.profile.avatarDriveFileId) {
      try {
        await deleteDriveFile(user.profile.avatarDriveFileId);
        await Upload.deleteOne({ driveFileId: user.profile.avatarDriveFileId });
      } catch (err) {
        console.error("Failed to delete old avatar from Drive:", err);
      }
    }

    user.profile.avatarUrl = publicUrl;
    user.profile.avatarDriveFileId = fileId;
    await user.save();

    // Mark the new upload as used
    await Upload.findOneAndUpdate({ driveFileId: fileId }, { is_used: true });

    return publicUrl;
  }
}
