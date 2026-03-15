import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description?: string;
  currentBasePrice: number;
  isActive: boolean;
  stockLevel: number;
  linkedDesignId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
  },
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
