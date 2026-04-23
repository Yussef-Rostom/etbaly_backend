import { Schema, Types } from "mongoose";
import {
  ICustomizationParams,
  customizationParamsSchema,
} from "#src/models/schemas/CustomizationParamsSchema";

export interface ICartItem {
  _id: Types.ObjectId;
  itemType: "Product" | "Design";
  itemRefId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  customization?: ICustomizationParams;
  materialId?: Types.ObjectId;
}

export const cartItemSchema = new Schema<ICartItem>(
  {
    itemType: {
      type: String,
      enum: ["Product", "Design"],
      required: true,
    },
    itemRefId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "items.itemType",
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price cannot be negative"],
    },
    customization: {
      type: customizationParamsSchema,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
    },
  },
  { _id: true },
);
