import { Schema } from "mongoose";

export interface IProfile {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
  avatarDriveFileId?: string;
}

export const profileSchema = new Schema<IProfile>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name must be at most 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name must be at most 50 characters"],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio must be at most 500 characters"],
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    avatarDriveFileId: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);
