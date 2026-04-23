import { Schema } from "mongoose";

export interface IDesignMetadata {
  volumeCm3?: number;
  dimensions?: {
    x?: number;
    y?: number;
    z?: number;
  };
  estimatedPrintTime?: number;
  supportedMaterials: ("PLA" | "ABS" | "Resin" | "TPU" | "PETG")[];
}

export const designMetadataSchema = new Schema<IDesignMetadata>(
  {
    volumeCm3: {
      type: Number,
    },
    dimensions: {
      x: { type: Number },
      y: { type: Number },
      z: { type: Number },
    },
    estimatedPrintTime: {
      type: Number,
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
