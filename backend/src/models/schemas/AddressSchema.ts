import { Schema } from "mongoose";

export interface IAddress {
  street: string;
  city: string;
  country: string;
  zip: string;
}

export const addressSchema = new Schema<IAddress>(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
  },
  { _id: false },
);
