import mongoose from "mongoose";
import jsonwebtoken from "jsonwebtoken";
import crypto from "crypto";
import { admin } from "#src/configs/firebaseConfig";
import { User, IUser } from "#src/models/User";
import { AppError } from "#src/utils/AppError";
import { env } from "#src/configs/envConfig";
import {
  RegisterInput,
  LoginInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  GoogleAuthInput,
} from "#src/modules/auth/validators/authValidators";
import { sendEmail } from "#src/utils/sendEmail";

const { sign } = jsonwebtoken;

export class AuthService {
  private static generateTokens(userId: string): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = sign({ id: userId }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jsonwebtoken.SignOptions);

    const refreshToken = sign({ id: userId }, env.REFRESH_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as string,
    } as jsonwebtoken.SignOptions);

    return { accessToken, refreshToken };
  }

  private static formatUserResponse(user: IUser): Partial<IUser> {
    return {
      _id: user._id,
      profile: user.profile,
      email: user.email,
      role: user.role,
    };
  }

  /** Registers a new user and sends an OTP for email verification. */
  static async register(
    data: RegisterInput,
  ): Promise<{ message: string; user: Partial<IUser> }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError("A user with this email already exists.", 409);
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      profile: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
      },
      email: data.email,
      password: data.password,
      otp,
      otpExpiresAt,
      isVerified: false,
    });

    await sendEmail(
      user.email,
      "Welcome to Etbaly - Verify Your Account",
      `Your verification code is: ${otp}\nThis code will expire in 10 minutes.`,
      `
        <h2>Welcome to Etbaly!</h2>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    );

    return {
      message: "Registration successful. An OTP has been sent to your email.",
      user: this.formatUserResponse(user),
    };
  }

  /** Authenticates a user with email/password and returns access/refresh tokens. */
  static async login(data: LoginInput): Promise<{
    message: string;
    user: Partial<IUser>;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await User.findOne({ email: data.email }).select(
      "+password +refreshTokens",
    );
    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    if (!user.isVerified) {
      throw new AppError("Please verify your account first.", 403);
    }

    const isPasswordCorrect = await user.comparePassword(data.password);
    if (!isPasswordCorrect) {
      throw new AppError("Invalid email or password.", 401);
    }

    const { accessToken, refreshToken } = this.generateTokens(
      (user._id as mongoose.Types.ObjectId).toString(),
    );

    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    return {
      message: "Login successful.",
      user: this.formatUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  /** Authenticates or registers a user via Firebase ID Token. */
  static async googleAuth(data: GoogleAuthInput): Promise<{
    message: string;
    user: Partial<IUser>;
    accessToken: string;
    refreshToken: string;
  }> {
    let firebasePayload: any;
    try {
      firebasePayload = await admin.auth().verifyIdToken(data.idToken);
    } catch (error: any) {
      console.log("---------------------------------");
      console.log(error.message);
      console.log("---------------------------------");
      throw new AppError("Invalid Google ID Token", 401);
    }

    const userEmail = firebasePayload.email;
    if (!userEmail) {
      throw new AppError("Failed to fetch user email from Google", 400);
    }

    const email = firebasePayload.email.toLowerCase().trim();
    let user = await User.findOne({ email }).select("+refreshTokens");

    if (!user) {
      const secureRandomPassword = crypto.randomBytes(32).toString("hex");
      user = await User.create({
        email,
        password: secureRandomPassword,
        profile: {
          firstName: firebasePayload.name?.split(" ")[0] || "Google",
          lastName: firebasePayload.name?.split(" ").slice(1).join(" ") || "User",
          avatarUrl: firebasePayload.picture || undefined,
        },
        isVerified: true,
      });
      user.refreshTokens = [];
    } else {
      if (!user.isVerified) {
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
      }
      if (!user.refreshTokens) {
        user.refreshTokens = [];
      }
    }

    const { accessToken, refreshToken } = this.generateTokens(
      (user._id as mongoose.Types.ObjectId).toString(),
    );

    user.refreshTokens.push(refreshToken);
    await user.save();

    return {
      message: "Google authentication successful.",
      user: this.formatUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  /** Verifies a user's account using the OTP sent to their email. */
  static async verifyOtp(data: VerifyOtpInput): Promise<{
    message: string;
    user: Partial<IUser>;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await User.findOne({ email: data.email }).select(
      "+otp +otpExpiresAt +password +refreshTokens",
    );

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    if (user.isVerified) {
      throw new AppError("Account is already verified.", 400);
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    if (!(await user.compareOtp(data.otp))) {
      throw new AppError("Invalid or expired OTP.", 400);
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    const { accessToken, refreshToken } = this.generateTokens(
      (user._id as mongoose.Types.ObjectId).toString(),
    );

    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);

    await user.save();

    return {
      message: "Account verified successfully.",
      user: this.formatUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  /** Resends a verification OTP to an unverified user's email. */
  static async resendOtp(data: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await User.findOne({ email: data.email }).select("+otp +otpExpiresAt");

    // Always return the same message to prevent email enumeration
    if (!user || user.isVerified) {
      return { message: "If an unverified account with that email exists, a new OTP has been sent." };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail(
      user.email,
      "Etbaly - Resend Verification Code",
      `Your new verification code is: ${otp}\nThis code will expire in 10 minutes.`,
      `
        <h2>Verify Your Account</h2>
        <p>Your new verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    );

    return { message: "If an unverified account with that email exists, a new OTP has been sent." };
  }

  /** Returns success even if user doesn't exist to prevent email enumeration. */
  static async forgotPassword(
    data: ForgotPasswordInput,
  ): Promise<{ message: string }> {
    const user = await User.findOne({ email: data.email });

    if (!user) {
      return {
        message: "If an account with that email exists, an OTP has been sent.",
      };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;

    await user.save();

    await sendEmail(
      user.email,
      "Etbaly - Password Reset",
      `Your password reset code is: ${otp}\nThis code will expire in 10 minutes.`,
      `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Your code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    );

    return {
      message: "If an account with that email exists, an OTP has been sent.",
    };
  }

  /** Resets a user's password using the verified OTP and logs them out of all devices. */
  static async resetPassword(
    data: ResetPasswordInput,
  ): Promise<{ message: string }> {
    const user = await User.findOne({ email: data.email }).select(
      "+otp +otpExpiresAt +password",
    );

    if (!user) {
      throw new AppError("Invalid or expired OTP.", 400);
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    if (!(await user.compareOtp(data.otp))) {
      throw new AppError("Invalid or expired OTP.", 400);
    }

    user.password = data.newPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    // Force re-login on all devices after password reset
    user.refreshTokens = [];

    await user.save();

    return {
      message:
        "Password has been successfully reset. Please log in with your new password.",
    };
  }

  /** Refresh access token using rotation & reuse detection. */
  static async refreshToken(
    token: string,
  ): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    let decoded: any;
    try {
      decoded = jsonwebtoken.verify(token, env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      throw new AppError("Invalid or expired refresh token", 403);
    }

    const user = await User.findById(decoded.id).select("+refreshTokens");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Reuse detection: token valid but not in DB → likely stolen, clear all tokens
    if (!user.refreshTokens.includes(token)) {
      user.refreshTokens = [];
      await user.save();
      throw new AppError(
        "Refresh token reuse detected. Please logs in again.",
        403,
      );
    }

    // Rotate: remove old, generate new pair, save
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);

    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(
      (user._id as mongoose.Types.ObjectId).toString(),
    );

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return {
      message: "Token refreshed successfully.",
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /** Logs out a user by invalidating the provided refresh token. */
  static async logout(token?: string): Promise<{ message: string }> {
    if (!token) {
      return { message: "Logged out successfully." };
    }

    try {
      const decoded = jsonwebtoken.verify(token, env.REFRESH_TOKEN_SECRET) as {
        id: string;
      };
      const user = await User.findById(decoded.id).select("+refreshTokens");

      if (token && user && user.refreshTokens) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
        await user.save();
      }
    } catch (error) {
      // Token invalid/expired — effectively already logged out
    }

    return { message: "Logged out successfully." };
  }
}
