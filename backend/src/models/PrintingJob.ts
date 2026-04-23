import mongoose, { Document, Schema } from "mongoose";

export interface IPrintingJob extends Document {
  jobNumber: string;
  slicingJobId: mongoose.Types.ObjectId;
  status: "Pending Review" | "Approved" | "Rejected" | "Queued" | "Processing" | "Completed" | "Failed";
  gcodeUrl: string;
  machineId?: string;
  fileName: string;
  startedAt?: Date;
  finishedAt?: Date;
  operatorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const printingJobSchema = new Schema<IPrintingJob>(
  {
    jobNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    slicingJobId: {
      type: Schema.Types.ObjectId,
      ref: "SlicingJob",
      required: [true, "Slicing Job ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending Review", "Approved", "Rejected", "Queued", "Processing", "Completed", "Failed"],
      default: "Pending Review",
      index: true,
    },
    gcodeUrl: {
      type: String,
      trim: true,
      required: [true, "G-code URL is required"],
    },
    machineId: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
      required: [true, "File name is required"],
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
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

// Pre-validation hook to ensure slicingJobId is provided
printingJobSchema.pre('validate', function() {
  if (!this.slicingJobId) {
    this.invalidate('slicingJobId', 'Slicing Job ID is required');
  }
});

export const PrintingJob = mongoose.model<IPrintingJob>(
  "PrintingJob",
  printingJobSchema,
);
