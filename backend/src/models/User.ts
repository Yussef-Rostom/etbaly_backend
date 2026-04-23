import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

import {
  IAddress,
  IProfile,
  addressSchema,
  profileSchema,
} from "#src/models/schemas";

export interface IUser extends Document {
  email: string;
  password: string;
  role: "client" | "admin" | "operator";
  profile: IProfile;
  savedAddresses: IAddress[];
  refreshTokens: string[];
  isVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareOtp(candidateOtp: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["client", "admin", "operator"],
      default: "client",
    },
    profile: {
      type: profileSchema,
      required: [true, "Profile is required"],
    },
    savedAddresses: {
      type: [addressSchema],
      default: [],
    },
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

/** Hash password and OTP before saving to database */
userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified("otp") && this.otp) {
    const salt = await bcrypt.genSalt(12);
    this.otp = await bcrypt.hash(this.otp, salt);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareOtp = async function (
  candidateOtp: string,
): Promise<boolean> {
  if (!this.otp) return false;
  return bcrypt.compare(candidateOtp, this.otp);
};

export const User = mongoose.model<IUser>("User", userSchema);
