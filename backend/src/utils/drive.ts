import { Readable } from "stream";
import { drive } from "#src/configs/driveConfig";
import { env } from "#src/configs/envConfig";
import { AppError } from "#src/utils/AppError";
import { redisCache } from "#src/utils/redisCache";

// Redis key prefix for Drive folder IDs (TTL: 24 h)
const DRIVE_FOLDER_TTL = 86_400; // seconds
const driveFolderKey = (name: string) => `drive:folder:${name}`;

/**
 * Resolves (or creates) a named subfolder under the master Drive folder.
 * Lookup order: Redis cache → Drive API list → Drive API create.
 * The resolved folder ID is written back to Redis with a 24-hour TTL.
 */
const getOrCreateFolder = async (folderName: string): Promise<string> => {
  const cacheKey = driveFolderKey(folderName);

  // 1. Try Redis first
  const cached = await redisCache.get(cacheKey);
  if (cached) return cached;

  // 2. Query Drive for an existing folder
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: 1,
  });

  let folderId: string;
  if (res.data.files?.length) {
    folderId = res.data.files[0].id!;
  } else {
    // 3. Create the folder if it doesn't exist
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [env.DRIVE_FOLDER_ID],
      },
      fields: "id",
    });
    folderId = folder.data.id!;
  }

  // 4. Persist to Redis for subsequent requests
  await redisCache.set(cacheKey, folderId, DRIVE_FOLDER_TTL);

  return folderId;
};

/** Resolves (or creates) the avatars subfolder. */
export const getOrCreateAvatarsFolder = () => getOrCreateFolder("avatars");

/** Resolves (or creates) the models subfolder. */
export const getOrCreateModelsFolder = () => getOrCreateFolder("models");

/** Resolves (or creates) the images subfolder. */
export const getOrCreateImagesFolder = () => getOrCreateFolder("images");

/** Resolves (or creates) the designs subfolder. */
export const getOrCreateDesignsFolder = () => getOrCreateFolder("designs");

/**
 * Uploads an image buffer to the images subfolder and returns fileId + public URL.
 */
export const uploadImage = async (
  fileBuffer: Buffer,
  fileName: string = `upload-${Date.now()}.jpg`,
  mimeType: string = "image/jpeg",
): Promise<{ fileId: string; publicUrl: string }> => {
  const folderId = await getOrCreateImagesFolder();
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new AppError("Failed to upload image to Google Drive.", 500);
  }

  // Make the file publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    publicUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
};

/**
 * Uploads an image buffer to the avatars subfolder and returns fileId + public URL.
 */
export const uploadAvatarImage = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ fileId: string; publicUrl: string }> => {
  const folderId = await getOrCreateAvatarsFolder();
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new AppError("Failed to upload image to Google Drive.", 500);
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    publicUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
};

/**
 * Uploads an STL buffer to the models subfolder and returns fileId + public URL.
 */
export const uploadSTLFile = async (
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ fileId: string; publicUrl: string }> => {
  const folderId = await getOrCreateModelsFolder();
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "model/stl",
      body: stream,
    },
    fields: "id",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new AppError("Failed to upload STL model to Google Drive.", 500);
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    publicUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
};



/**
 * Uploads any design file (STL, OBJ, etc.) to the designs subfolder
 * and returns fileId + public URL.
 */
export const uploadDesignFile = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = "model/stl",
): Promise<{ fileId: string; publicUrl: string }> => {
  const folderId = await getOrCreateDesignsFolder();
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new AppError("Failed to upload design file to Google Drive.", 500);
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    fileId,
    publicUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
};

/**
 * Downloads file content from Google Drive by ID.
 */
export const downloadDriveFile = async (fileId: string): Promise<Buffer> => {
  try {
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(response.data as ArrayBuffer);
  } catch (err: any) {
    console.error(`Failed to download Drive file ${fileId}:`, err);
    throw new AppError("Failed to download file from Google Drive.", 500);
  }
};

/**
 * Deletes a Drive file by ID. Silently ignores 404 (already deleted).
 * Logs and rethrows any other errors.
 */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  try {
    await drive.files.delete({ fileId });
  } catch (err: any) {
    const status = err?.response?.status ?? err?.code;
    if (status === 404 || status === "404") return;
    console.error(`Failed to delete Drive file ${fileId}:`, err);
    throw err;
  }
};
