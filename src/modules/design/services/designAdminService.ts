import mongoose from "mongoose";
import { Design, IDesign } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { uploadImage } from "#src/utils/drive";
import { AppError } from "#src/utils/AppError";
import {
  CreateDesignInput,
  UpdateDesignInput,
} from "#src/modules/design/validators/designAdminValidators";

function extractDriveFileId(fileUrl: string): string | null {
  try {
    return new URL(fileUrl).searchParams.get("id");
  } catch {
    return null;
  }
}

export class DesignAdminService {
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
        { driveFileId, fileUrl, isUsed: false },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    return fileUrl;
  }

  static async createDesign(userId: string, dto: CreateDesignInput): Promise<IDesign> {
    const tracker = await Upload.findOne({ fileUrl: dto.fileUrl });
    if (!tracker) {
      throw new AppError("fileUrl was not uploaded to our storage. Please upload the file first.", 400);
    }

    const design = await Design.create({
      name: dto.name,
      isPrintable: dto.isPrintable ?? false,
      metadata: dto.metadata,
      ownerId: new mongoose.Types.ObjectId(userId),
      fileUrl: dto.fileUrl,
    });

    tracker.isUsed = true;
    await tracker.save();

    return design;
  }

  static async updateDesign(
    designId: string,
    dto: UpdateDesignInput,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Promise<IDesign> {
    if (!mongoose.Types.ObjectId.isValid(designId)) {
      throw new AppError("Invalid design ID.", 400);
    }

    const design = await Design.findById(designId);
    if (!design) throw new AppError("Design not found.", 404);

    // Verify ownership: only the owner or an admin can update
    if (requestingUserId && requestingUserRole !== "admin") {
      if (design.ownerId.toString() !== requestingUserId) {
        throw new AppError("Forbidden: You do not own this design.", 403);
      }
    }

    const oldFileUrl = design.fileUrl;

    if (dto.fileUrl && dto.fileUrl !== oldFileUrl) {
      const tracker = await Upload.findOne({ fileUrl: dto.fileUrl });
      if (!tracker) {
        throw new AppError("fileUrl was not uploaded to our storage. Please upload the file first.", 400);
      }
    }

    if (dto.name !== undefined) design.name = dto.name;
    if (dto.isPrintable !== undefined) design.isPrintable = dto.isPrintable;
    if (dto.fileUrl !== undefined) design.fileUrl = dto.fileUrl;

    if (dto.metadata) {
      const m = dto.metadata;
      if (m.volumeCm3 !== undefined) design.metadata.volumeCm3 = m.volumeCm3;
      if (m.estimatedPrintTime !== undefined) design.metadata.estimatedPrintTime = m.estimatedPrintTime;
      if (m.supportedMaterials !== undefined) design.metadata.supportedMaterials = m.supportedMaterials;
      if (m.dimensions) {
        if (m.dimensions.x !== undefined) design.metadata.dimensions.x = m.dimensions.x;
        if (m.dimensions.y !== undefined) design.metadata.dimensions.y = m.dimensions.y;
        if (m.dimensions.z !== undefined) design.metadata.dimensions.z = m.dimensions.z;
      }
    }

    await design.save();

    if (dto.fileUrl && dto.fileUrl !== oldFileUrl) {
      await Upload.findOneAndUpdate({ fileUrl: dto.fileUrl }, { isUsed: true });

      const oldFileId = extractDriveFileId(oldFileUrl);
      if (oldFileId) {
        await Upload.findOneAndUpdate(
          { driveFileId: oldFileId },
          { driveFileId: oldFileId, fileUrl: oldFileUrl, isUsed: false },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    }

    return design;
  }

  static async deleteDesign(
    designId: string,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(designId)) {
      throw new AppError("Invalid design ID.", 400);
    }

    const design = await Design.findById(designId);
    if (!design) throw new AppError("Design not found.", 404);

    // Verify ownership: only the owner or an admin can delete
    if (requestingUserId && requestingUserRole !== "admin") {
      if (design.ownerId.toString() !== requestingUserId) {
        throw new AppError("Forbidden: You do not own this design.", 403);
      }
    }

    const fileUrl = design.fileUrl;
    await Design.deleteOne({ _id: design._id });

    const fileId = extractDriveFileId(fileUrl);
    if (fileId) {
      await Upload.findOneAndUpdate(
        { driveFileId: fileId },
        { driveFileId: fileId, fileUrl, isUsed: false },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }
}
