import { Schema } from "mongoose";
import {
  ICustomizationParams,
  customizationParamsSchema,
} from "#src/models/schemas/CustomizationParamsSchema";

export interface IOrderItem {
  _id?: Schema.Types.ObjectId;
  itemType: "Product" | "Design";
  quantity: number;
  customization?: ICustomizationParams;
  status: "Queued" | "Printing" | "Ready";
  price: number;
  itemRefId: Schema.Types.ObjectId;
  materialId?: Schema.Types.ObjectId;
}

export const orderItemSchema = new Schema<IOrderItem>(
  {
    itemType: {
      type: String,
      enum: ["Product", "Design"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    customization: {
      type: customizationParamsSchema,
    },
    status: {
      type: String,
      enum: ["Queued", "Printing", "Ready"],
      default: "Queued",
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    itemRefId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "items.itemType", // Dynamic reference based on itemType
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
    },
  },
  { _id: true }, // Order Items typically need their own _id to be referenced by Manufacturing Jobs easily
);
