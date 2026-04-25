import { Schema, Types } from "mongoose";
import {
  IPrintingProperties,
  printingPropertiesSchema,
} from "#src/models/schemas/PrintingPropertiesSchema";

export interface ICartItem {
  _id: Types.ObjectId;
  itemType: "Product" | "Design";
  itemRefId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  printingProperties?: IPrintingProperties;
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
    printingProperties: {
      type: printingPropertiesSchema,
    },
  },
  { _id: true },
);
