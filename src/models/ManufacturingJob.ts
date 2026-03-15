import mongoose, { Document, Schema } from "mongoose";

export interface IManufacturingJob extends Document {
  jobNumber: string;
  targetOrderItemId: mongoose.Types.ObjectId;
  status: "Queued" | "Slicing" | "Printing" | "Done" | "Failed";
  machineId?: string;
  gcodeUrl?: string;
  startedAt?: Date;
  finishedAt?: Date;
  orderId: mongoose.Types.ObjectId;
  operatorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const manufacturingJobSchema = new Schema<IManufacturingJob>(
  {
    jobNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    targetOrderItemId: {
      type: Schema.Types.ObjectId,
      required: [true, "Target Order Item ID is required"],
    },
    status: {
      type: String,
      enum: ["Queued", "Slicing", "Printing", "Done", "Failed"],
      default: "Queued",
      index: true,
    },
    machineId: {
      type: String,
      trim: true,
    },
    gcodeUrl: {
      type: String,
      trim: true,
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
      index: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

export const ManufacturingJob = mongoose.model<IManufacturingJob>(
  "ManufacturingJob",
  manufacturingJobSchema,
);
