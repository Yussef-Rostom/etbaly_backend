import mongoose, { Document, Schema, Types } from "mongoose";
import {
  ICartItem,
  IPricingSummary,
  cartItemSchema,
  pricingSummarySchema,
} from "#src/models/schemas";

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  pricingSummary: IPricingSummary;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    pricingSummary: {
      type: pricingSummarySchema,
      required: true,
      default: () => ({
        subtotal: 0,
        taxAmount: 0,
        shippingCost: 0,
        discountAmount: 0,
        total: 0,
      }),
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  },
);

export const Cart = mongoose.model<ICart>("Cart", cartSchema);
