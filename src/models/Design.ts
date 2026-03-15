import mongoose, { Document, Schema } from "mongoose";
import { IDesignMetadata, designMetadataSchema } from "#src/models/schemas";

export interface IDesign extends Document {
  name: string;
  isPrintable: boolean;
  metadata: IDesignMetadata;
  ownerId: mongoose.Types.ObjectId;
  fileUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const designSchema = new Schema<IDesign>(
  {
    name: {
      type: String,
      required: [true, "Design name is required"],
      trim: true,
    },
    isPrintable: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: designMetadataSchema,
      required: [true, "Design metadata is required"],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
  },
  {
    timestamps: true,
  },
);

export const Design = mongoose.model<IDesign>("Design", designSchema);
