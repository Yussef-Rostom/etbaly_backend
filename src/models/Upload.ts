import mongoose, { Document, Schema } from "mongoose";

export interface IUpload extends Document {
  driveFileId: string;
  fileUrl: string;
  is_used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const uploadSchema = new Schema<IUpload>(
  {
    driveFileId: {
      type: String,
      required: [true, "Drive file ID is required"],
      unique: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    is_used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

uploadSchema.index({ is_used: 1, createdAt: 1 });
uploadSchema.index({ fileUrl: 1 });

export const Upload = mongoose.model<IUpload>("Upload", uploadSchema);
