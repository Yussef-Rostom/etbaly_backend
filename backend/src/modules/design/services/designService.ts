import mongoose from "mongoose";
import { Design, IDesign } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { uploadDesignFile } from "#src/utils/drive";
import { AppError } from "#src/utils/AppError";

export class DesignService {
  /**
   * Uploads a design file to the "designs" Drive folder.
   * Returns the public URL and file ID for use in createDesign().
   */
  static async uploadDesign(file: Express.Multer.File): Promise<{ fileUrl: string; fileId: string }> {
    let fileUrl: string;
    let fileId: string;
    try {
      const result = await uploadDesignFile(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      fileUrl = result.publicUrl;
      fileId = result.fileId;

      // Track the upload so createDesign can verify the file was uploaded here
      await Upload.findOneAndUpdate(
        { driveFileId: fileId },
        { driveFileId: fileId, fileUrl, isUsed: false },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Failed to upload design file to Google Drive.", 500);
    }
    return { fileUrl, fileId };
  }

  /**
   * Create a new design document
   */
  static async createDesign(
    name: string,
    fileUrl: string,
    ownerId: string,
    isPrintable: boolean = false,
    supportedMaterials: string[] = ["PLA"],
    thumbnailUrl?: string,
  ): Promise<IDesign> {
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      throw new AppError("Invalid owner ID.", 400);
    }

    const design = await Design.create({
      name,
      isPrintable,
      metadata: {
        supportedMaterials,
      },
      ownerId: new mongoose.Types.ObjectId(ownerId),
      fileUrl,
      ...(thumbnailUrl && { thumbnailUrl }),
    });

    return design;
  }

  static async getDesigns(userId: string, role: string): Promise<IDesign[]> {
    if (role === "admin") {
      return Design.find();
    }
    return Design.find({ ownerId: new mongoose.Types.ObjectId(userId) });
  }

  static async getDesignById(
    userId: string,
    role: string,
    designId: string,
  ): Promise<IDesign> {
    if (!mongoose.Types.ObjectId.isValid(designId)) {
      throw new AppError("Invalid design ID.", 400);
    }

    const design = await Design.findById(designId);
    if (!design) {
      throw new AppError("Design not found.", 404);
    }

    if (
      role !== "admin" &&
      !design.ownerId.equals(new mongoose.Types.ObjectId(userId))
    ) {
      throw new AppError("You do not have permission to perform this action.", 403);
    }

    return design;
  }
}
