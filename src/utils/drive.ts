import { Readable } from "stream";
import { drive } from "#src/configs/driveConfig";
import { env } from "#src/configs/envConfig";
import { AppError } from "#src/utils/AppError";

let cachedAvatarsFolderId: string | null = null;

/**
 * Resolves (or creates) the avatars subfolder under the master Drive folder.
 * Caches the folder ID in memory to avoid repeated Drive API lookups.
 */
export const getOrCreateAvatarsFolder = async (): Promise<string> => {
  if (cachedAvatarsFolderId) return cachedAvatarsFolderId;

  const res = await drive.files.list({
    q: `name='avatars' and mimeType='application/vnd.google-apps.folder' and '${env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: 1,
  });

  if (res.data.files?.length) {
    cachedAvatarsFolderId = res.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: "avatars",
        mimeType: "application/vnd.google-apps.folder",
        parents: [env.DRIVE_FOLDER_ID],
      },
      fields: "id",
    });
    cachedAvatarsFolderId = folder.data.id!;
  }

  return cachedAvatarsFolderId;
};

/**
 * Uploads an image buffer to Google Drive and returns a public URL.
 * The file is placed in DRIVE_FOLDER_ID and made publicly readable.
 */
export const uploadImage = async (
  fileBuffer: Buffer,
  fileName: string = `upload-${Date.now()}.jpg`,
  mimeType: string = "image/jpeg",
): Promise<string> => {
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: env.DRIVE_FOLDER_ID ? [env.DRIVE_FOLDER_ID] : [],
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

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
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
