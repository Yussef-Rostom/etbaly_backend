import mongoose, { Document, Schema } from "mongoose";
import {
  IPrintingProperties,
  printingPropertiesSchema,
} from "#src/models/schemas/PrintingPropertiesSchema";

export interface ICustomField {
  fieldName: string;
  fieldType: "text" | "number" | "date";
  isRequired: boolean;
  label: string;
  placeholder?: string;
}

export interface ISlicingResult {
  gcodeUrl: string;
  dimensions: { width: number; height: number; depth: number };
  weight: number;       // grams
  printTime: number;    // minutes
  calculatedPrice: number;
  slicedAt: Date;
}

export interface IProduct extends Document {
  name: string;
  description?: string;
  images: string[];
  isActive: boolean;
  linkedDesignId: mongoose.Types.ObjectId;
  slicingJobId: mongoose.Types.ObjectId;       // the slicing job that produced the default result
  printingProperties?: IPrintingProperties;    // server-populated from slicingJob (not user input)
  slicingResult?: ISlicingResult;              // server-populated from slicingJob (not user input)
  isCustomizable: boolean;
  customFields?: ICustomField[];
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<ICustomField>(
  {
    fieldName: { type: String, required: true, trim: true },
    fieldType: { type: String, enum: ["text", "number", "date"], required: true },
    isRequired: { type: Boolean, default: false },
    label: { type: String, required: true, trim: true },
    placeholder: { type: String, trim: true },
  },
  { _id: false },
);

const slicingResultSchema = new Schema<ISlicingResult>(
  {
    gcodeUrl: { type: String, required: true, trim: true },
    dimensions: {
      type: {
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        depth: { type: Number, required: true },
      },
      required: true,
      _id: false,
    },
    weight: { type: Number, required: true, min: 0 },
    printTime: { type: Number, required: true, min: 0 },
    calculatedPrice: { type: Number, required: true, min: 0 },
    slicedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
      text: true,
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    linkedDesignId: {
      type: Schema.Types.ObjectId,
      ref: "Design",
      required: [true, "Linked Design ID is required"],
    },
    slicingJobId: {
      type: Schema.Types.ObjectId,
      ref: "SlicingJob",
      required: [true, "Slicing Job ID is required"],
      index: true,
    },
    printingProperties: {
      type: printingPropertiesSchema,
      default: undefined,
    },
    slicingResult: {
      type: slicingResultSchema,
      default: undefined,
    },
    isCustomizable: {
      type: Boolean,
      default: false,
    },
    customFields: {
      type: [customFieldSchema],
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Returns true when the product has a completed slicing output with a G-code URL.
 */
export function isProductPrintingReady(product: IProduct): boolean {
  return !!product.slicingResult?.gcodeUrl;
}

/**
 * Validates logical consistency between isCustomizable and customFields.
 *
 * @throws {Error} When isCustomizable is true but customFields is absent or empty
 */
export function validateCustomizability(
  isCustomizable: boolean,
  customFields?: ICustomField[],
): void {
  if (isCustomizable && (!customFields || customFields.length === 0)) {
    throw new Error(
      "Products marked as customizable must have at least one custom field defined",
    );
  }
}

export const Product = mongoose.model<IProduct>("Product", productSchema);
