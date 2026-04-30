import { Schema } from "mongoose";

export interface ICustomField {
  key: string;
  value: string;
}

export interface IPrintingProperties {
  material?: string;
  color?: string;
  /** Scale percentage: 1–1000 (100 = original size) */
  scale?: number;
  preset?: "heavy" | "normal" | "draft";
  customFields?: ICustomField[];
}

const customFieldSchema = new Schema<ICustomField>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export const printingPropertiesSchema = new Schema<IPrintingProperties>(
  {
    material: { type: String, trim: true },
    color: { type: String, trim: true },
    scale: { type: Number, min: 1, max: 1000, default: 100 },
    preset: { type: String, enum: ["heavy", "normal", "draft"] },
    customFields: { type: [customFieldSchema], default: undefined },
  },
  { _id: false },
);
