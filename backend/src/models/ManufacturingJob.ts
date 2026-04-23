import mongoose, { Document, Schema } from "mongoose";

export interface IManufacturingJob extends Document {
  jobNumber: string;
  targetOrderItemId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  status: "Queued" | "Slicing" | "Printing" | "Done" | "Failed";
  machineId?: string;
  gcodeUrl?: string;
  stlFileUrl?: string;
  fileName?: string;
  startedAt?: Date;
  finishedAt?: Date;
  orderId?: mongoose.Types.ObjectId;
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
      required: false,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: false,
      index: true,
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
    stlFileUrl: {
      type: String,
      trim: true,
    },
    fileName: {
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
      required: false,
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

// Pre-validation hook to ensure either productId or targetOrderItemId exists (not both)
manufacturingJobSchema.pre('validate', function() {
  if (!this.productId && !this.targetOrderItemId) {
    this.invalidate('productId', 'Either productId or targetOrderItemId must be provided');
  } else if (this.productId && this.targetOrderItemId) {
    this.invalidate('productId', 'Cannot have both productId and targetOrderItemId');
  }
});

export const ManufacturingJob = mongoose.model<IManufacturingJob>(
  "ManufacturingJob",
  manufacturingJobSchema,
);
