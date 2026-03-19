import mongoose from "mongoose";
import { Design, IDesign } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { uploadImage, deleteDriveFile } from "#src/utils/drive";
import { AppError } from "#src/utils/AppError";
import {
  CreateDesignInput,
  UpdateDesignInput,
} from "#src/modules/design/validators/designValidators";

/**
 * Extracts the Google Drive file ID from a Drive public URL.
 * URL format: https://drive.google.com/uc?export=view&id={fileId}
 */
function extractDriveFileId(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    return url.searchParams.get("id");
  } catch {
    return null;
  }
}

export class DesignService {
  /**
   * Uploads a file to Google Drive and returns the public URL.
   */
  static async uploadDesignFile(file: Express.Multer.File): Promise<string> {
    let fileUrl: string;
    try {
      fileUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
    } catch {
      throw new AppError("Failed to upload design file to Google Drive.", 500);
    }

    const driveFileId = extractDriveFileId(fileUrl);
    if (driveFileId) {
      await Upload.findOneAndUpdate(
        { driveFileId },
        { driveFileId, fileUrl, is_used: false },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    return fileUrl;
  }

  /**
   * Creates a new Design document using a pre-uploaded fileUrl.
   */
  static async createDesign(
    userId: string,
    dto: CreateDesignInput,
  ): Promise<IDesign> {
    const design = await Design.create({
      name: dto.name,
      isPrintable: dto.isPrintable ?? false,
      metadata: dto.metadata,
      ownerId: new mongoose.Types.ObjectId(userId),
      fileUrl: dto.fileUrl,
    });

    const tracker = await Upload.findOneAndUpdate(
      { fileUrl: dto.fileUrl },
      { is_used: true },
    );
    if (!tracker) {
      console.warn(`[UploadGC] No Upload_Tracker found for fileUrl: ${dto.fileUrl}`);
    }

    return design;
  }

  /**
   * Returns all designs for admin, or only the caller's designs for clients.
   */
  static async getDesigns(userId: string, role: string): Promise<IDesign[]> {
    if (role === "admin") {
      return Design.find();
    }
    return Design.find({ ownerId: new mongoose.Types.ObjectId(userId) });
  }

  /**
   * Returns a single design by ID, enforcing ownership for non-admins.
   */
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
      throw new AppError(
        "You do not have permission to perform this action.",
        403,
      );
    }

    return design;
  }

  /**
   * Applies partial updates to a design. If dto.fileUrl is provided and differs
   * from the current fileUrl, the old Drive file is deleted.
   */
  static async updateDesign(
    userId: string,
    role: string,
    designId: string,
    dto: UpdateDesignInput,
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
      throw new AppError(
        "You do not have permission to perform this action.",
        403,
      );
    }

    const oldFileUrl = design.fileUrl;

    // Apply field updates
    if (dto.name !== undefined) design.name = dto.name;
    if (dto.isPrintable !== undefined) design.isPrintable = dto.isPrintable;
    if (dto.fileUrl !== undefined) design.fileUrl = dto.fileUrl;

    // Apply partial metadata updates
    if (dto.metadata) {
      const m = dto.metadata;
      if (m.volumeCm3 !== undefined) design.metadata.volumeCm3 = m.volumeCm3;
      if (m.estimatedPrintTime !== undefined)
        design.metadata.estimatedPrintTime = m.estimatedPrintTime;
      if (m.supportedMaterials !== undefined)
        design.metadata.supportedMaterials = m.supportedMaterials;
      if (m.dimensions) {
        if (m.dimensions.x !== undefined) design.metadata.dimensions.x = m.dimensions.x;
        if (m.dimensions.y !== undefined) design.metadata.dimensions.y = m.dimensions.y;
        if (m.dimensions.z !== undefined) design.metadata.dimensions.z = m.dimensions.z;
      }
    }

    await design.save();

    // Delete old Drive file if fileUrl was replaced
    if (dto.fileUrl && dto.fileUrl !== oldFileUrl) {
      const oldFileId = extractDriveFileId(oldFileUrl);
      if (oldFileId) {
        try {
          await deleteDriveFile(oldFileId);
        } catch (err) {
          console.error(
            `Failed to delete old Drive file ${oldFileId} during design update:`,
            err,
          );
        }
      }
    }

    return design;
  }

  /**
   * Deletes a design document from DB, then attempts to delete the Drive file.
   * Drive deletion errors are logged and swallowed.
   */
  static async deleteDesign(
    userId: string,
    role: string,
    designId: string,
  ): Promise<void> {
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
      throw new AppError(
        "You do not have permission to perform this action.",
        403,
      );
    }

    const fileUrl = design.fileUrl;

    // Delete DB document first
    await Design.deleteOne({ _id: design._id });

    // Attempt Drive file deletion — swallow errors
    const fileId = extractDriveFileId(fileUrl);
    if (fileId) {
      try {
        await deleteDriveFile(fileId);
      } catch (err) {
        console.error(
          `Failed to delete Drive file ${fileId} for design ${designId}:`,
          err,
        );
      }
    }
  }
}
