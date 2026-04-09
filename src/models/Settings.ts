import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  key: string;
  value: string;
  description?: string;
  updatedAt: Date;
  createdAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: [true, "Setting key is required"],
      unique: true,
      trim: true,
    },
    value: {
      type: String,
      required: [true, "Setting value is required"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
settingsSchema.index({ key: 1 });

const Settings = mongoose.model<ISettings>("Settings", settingsSchema);

export default Settings;
