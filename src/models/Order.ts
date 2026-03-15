import mongoose, { Document, Schema } from "mongoose";
import {
  IOrderItem,
  IPricingSummary,
  IPayment,
  IAddress,
  orderItemSchema,
  pricingSummarySchema,
  paymentSchema,
  addressSchema,
} from "#src/models/schemas/index";

export interface IOrder extends Document {
  orderNumber: string;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  items: IOrderItem[];
  shippingAddressSnapshot: IAddress;
  paymentInfo: IPayment;
  pricingSummary: IPricingSummary;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: [true, "At least one item is required in the order"],
    },
    shippingAddressSnapshot: {
      type: addressSchema,
      required: [true, "Shipping address snapshot is required"],
    },
    paymentInfo: {
      type: paymentSchema,
      required: [true, "Payment information is required"],
    },
    pricingSummary: {
      type: pricingSummarySchema,
      required: [true, "Pricing summary is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required for the order"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);
