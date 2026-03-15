import { Schema } from "mongoose";

export interface IDesignMetadata {
  volumeCm3: number;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  estimatedPrintTime: number;
  supportedMaterials: ("PLA" | "ABS" | "Resin" | "TPU" | "PETG")[];
}

export const designMetadataSchema = new Schema<IDesignMetadata>(
  {
    volumeCm3: {
      type: Number,
      required: [true, "Volume in cm³ is required"],
    },
    dimensions: {
      x: { type: Number, required: [true, "Dimension X is required"] },
      y: { type: Number, required: [true, "Dimension Y is required"] },
      z: { type: Number, required: [true, "Dimension Z is required"] },
    },
    estimatedPrintTime: {
      type: Number,
      required: [true, "Estimated print time is required"],
    },
    supportedMaterials: {
      type: [String],
      enum: {
        values: ["PLA", "ABS", "Resin", "TPU", "PETG"],
        message: "{VALUE} is not a valid material",
      },
      default: ["PLA"],
    },
  },
  { _id: false },
);
