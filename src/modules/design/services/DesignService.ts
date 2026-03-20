import mongoose from "mongoose";
import { Design, IDesign } from "#src/models/Design";
import { AppError } from "#src/utils/AppError";

export class DesignService {
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
