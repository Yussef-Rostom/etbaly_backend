import cloudinary from "@/configs/cloudinaryConfig";
import { AppError } from "@/utils/AppError";

export const uploadImage = async (
  fileBuffer: Buffer,
  folderName: string = "etbaly/avatars",
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (error) {
          reject(new AppError("Failed to upload image to Cloudinary", 500));
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new AppError("Unknown Cloudinary error", 500));
        }
      },
    );
    stream.end(fileBuffer);
  });
};
