import mongoose, { Document, Schema } from "mongoose";

export interface ISlicingJob extends Document {
  designId: mongoose.Types.ObjectId;
  targetOrderItemId?: mongoose.Types.ObjectId;
  status: "Queued" | "Processing" | "Completed" | "Failed";
  stlFileUrl?: string;
  gcodeUrl?: string;
  fileName?: string;
  material?: string; // Material type used for slicing
  color?: string; // Filament color (informational)
  preset?: string; // Slicing preset (heavy, normal, draft)
  scale?: number; // Scale percentage
  weight?: number; // Weight in grams
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  printTime?: number; // Print time in minutes
  calculatedPrice?: number; // Calculated price based on weight and time
  startedAt?: Date;
  finishedAt?: Date;
  orderId?: mongoose.Types.ObjectId;
  operatorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const slicingJobSchema = new Schema<ISlicingJob>(
  {
    targetOrderItemId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    designId: {
      type: Schema.Types.ObjectId,
      ref: "Design",
      required: [true, "Design ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["Queued", "Processing", "Completed", "Failed"],
      default: "Queued",
      index: true,
    },
    stlFileUrl: {
      type: String,
      trim: true,
    },
    gcodeUrl: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    material: {
      type: String,
      trim: true,
      index: true,
    },
    color: {
      type: String,
      trim: true,
    },
    preset: {
      type: String,
      trim: true,
      enum: ["heavy", "normal", "draft", null],
      index: true,
    },
    scale: {
      type: Number,
      min: 1,
      max: 1000,
    },
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      type: {
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        depth: { type: Number, required: true },
      },
      required: false,
      _id: false,
    },
    printTime: {
      type: Number,
      min: 0,
    },
    calculatedPrice: {
      type: Number,
      min: 0,
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

// Compound index for finding existing slicing jobs with same parameters
slicingJobSchema.index({ 
  designId: 1, 
  material: 1, 
  preset: 1, 
  scale: 1,
  status: 1 
});

// Pre-validation hook to ensure designId is provided
slicingJobSchema.pre('validate', function() {
  if (!this.designId) {
    this.invalidate('designId', 'Design ID is required');
  }
});

export const SlicingJob = mongoose.model<ISlicingJob>(
  "SlicingJob",
  slicingJobSchema,
);
