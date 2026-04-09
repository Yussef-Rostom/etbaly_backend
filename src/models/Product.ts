import mongoose, { Document, Schema } from "mongoose";

export interface ICustomField {
  fieldName: string;
  fieldType: "text" | "number" | "date";
  isRequired: boolean;
  label: string;
  placeholder?: string;
}

export interface IProduct extends Document {
  name: string;
  description?: string;
  images: string[];
  currentBasePrice: number;
  isActive: boolean;
  stockLevel: number;
  linkedDesignId: mongoose.Types.ObjectId;
  isPrintingReady: boolean;
  gcodeUrl?: string;
  isCustomizable: boolean;
  customFields?: ICustomField[];
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<ICustomField>(
  {
    fieldName: {
      type: String,
      required: true,
      trim: true,
    },
    fieldType: {
      type: String,
      enum: ["text", "number", "date"],
      required: true,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    placeholder: {
      type: String,
      trim: true,
    },
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
    currentBasePrice: {
      type: Number,
      required: [true, "Current base price is required"],
      min: [0, "Price cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    stockLevel: {
      type: Number,
      required: [true, "Stock level is required"],
      min: [0, "Stock level cannot be negative"],
      default: 0,
    },
    linkedDesignId: {
      type: Schema.Types.ObjectId,
      ref: "Design",
      required: [true, "Linked Design ID is required"],
    },
    isPrintingReady: {
      type: Boolean,
      default: false,
      index: true,
    },
    gcodeUrl: {
      type: String,
      trim: true,
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
 * Validates logical consistency between isPrintingReady and gcodeUrl fields.
 * 
 * Enforces Requirement 3.1: Products marked as printing ready must have a G-code URL.
 * 
 * @param isPrintingReady - Whether the product is ready for printing
 * @param gcodeUrl - Optional URL to the G-code file
 * @throws {Error} When isPrintingReady is true but gcodeUrl is absent or empty
 * 
 * @example
 * // In service layer before creating/updating a product:
 * validatePrintingReadiness(data.isPrintingReady, data.gcodeUrl);
 * await Product.create(data);
 */
export function validatePrintingReadiness(
  isPrintingReady: boolean,
  gcodeUrl?: string,
): void {
  if (isPrintingReady && (!gcodeUrl || gcodeUrl.trim() === "")) {
    throw new Error(
      "Products marked as printing ready must have a G-code URL",
    );
  }
}

/**
 * Validates logical consistency between isCustomizable and customFields.
 * 
 * Enforces: Products marked as customizable must have customFields defined.
 * 
 * @param isCustomizable - Whether the product allows customization
 * @param customFields - Optional array of custom field definitions
 * @throws {Error} When isCustomizable is true but customFields is absent or empty
 * 
 * @example
 * // In service layer before creating/updating a product:
 * validateCustomizability(data.isCustomizable, data.customFields);
 * await Product.create(data);
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
