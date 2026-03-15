import { Schema } from "mongoose";

export interface IPayment {
  method: "Card" | "Wallet" | "COD";
  transactionId?: string;
  status: "Pending" | "Paid" | "Failed";
  amountPaid: number;
  paidAt?: Date;
}

export const paymentSchema = new Schema<IPayment>(
  {
    method: {
      type: String,
      enum: ["Card", "Wallet", "COD"],
      required: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paidAt: {
      type: Date,
    },
  },
  { _id: false },
);
