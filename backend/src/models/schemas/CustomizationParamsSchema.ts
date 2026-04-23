import { Schema } from "mongoose";

export interface ICustomizationParams {
  color?: string;
  infillPercentage?: number;
  layerHeight?: number;
  scale?: number;
  customFields?: Record<string, any>;
}

export const customizationParamsSchema = new Schema<ICustomizationParams>(
  {
    color: { type: String, trim: true },
    infillPercentage: { type: Number, min: 0, max: 100 },
    layerHeight: { type: Number, min: 0.05, max: 1.0 },
    scale: { type: Number, min: 0.1, max: 10, default: 1 },
    customFields: { type: Schema.Types.Mixed },
  },
  { _id: false },
);
