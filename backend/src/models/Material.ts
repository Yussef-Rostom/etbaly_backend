import mongoose, { Document, Schema } from "mongoose";

export interface IMaterial extends Document {
  name: string;
  type: "PLA" | "ABS" | "Resin" | "TPU" | "PETG";
  currentPricePerGram: number;
  colorHex?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    name: {
      type: String,
      required: [true, "Material name is required"],
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["PLA", "ABS", "Resin", "TPU", "PETG"],
      required: [true, "Material type is required"],
    },
    currentPricePerGram: {
      type: Number,
      required: [true, "Current price per gram is required"],
      min: [0, "Price cannot be negative"],
    },
    colorHex: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Material = mongoose.model<IMaterial>("Material", materialSchema);
