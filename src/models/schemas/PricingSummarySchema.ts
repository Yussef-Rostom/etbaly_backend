import { Schema } from "mongoose";

export interface IPricingSummary {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
}

export const pricingSummarySchema = new Schema<IPricingSummary>(
  {
    subtotal: { type: Number, required: true, default: 0, min: 0 },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    shippingCost: { type: Number, required: true, default: 0, min: 0 },
    discountAmount: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);
