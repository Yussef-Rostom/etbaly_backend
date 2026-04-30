import mongoose, { Document, Schema } from "mongoose";

export interface IMaterial extends Document {
  name: string; // Descriptive name like "Standard PLA Filament"
  type: "PLA" | "ABS" | "Resin" | "TPU" | "PETG";
  currentPricePerGram: number;
  color: string; // Color name like "White", "Black", "Red"
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
    },
    type: {
      type: String,
      enum: ["PLA", "ABS", "Resin", "TPU", "PETG"],
      required: [true, "Material type is required"],
      index: true,
    },
    currentPricePerGram: {
      type: Number,
      required: [true, "Current price per gram is required"],
      min: [0, "Price cannot be negative"],
    },
    color: {
      type: String,
      required: [true, "Material color is required"],
      trim: true,
      index: true,
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

// Compound unique index: same type + color combination cannot exist twice
materialSchema.index({ type: 1, color: 1 }, { unique: true });

export const Material = mongoose.model<IMaterial>("Material", materialSchema);
