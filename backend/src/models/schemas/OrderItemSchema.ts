import { Schema } from "mongoose";
import {
  IPrintingProperties,
  printingPropertiesSchema,
} from "#src/models/schemas/PrintingPropertiesSchema";

export interface IOrderItem {
  _id?: Schema.Types.ObjectId;
  itemType: "Product" | "Design";
  quantity: number;
  printingProperties?: IPrintingProperties;
  status: "Queued" | "Printing" | "Ready";
  price: number;
  itemRefId: Schema.Types.ObjectId;
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
    printingProperties: {
      type: printingPropertiesSchema,
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
      refPath: "items.itemType",
    },
  },
  { _id: true },
);
