import { drive } from "#src/configs/driveConfig";
import { AppError } from "#src/utils/AppError";
import { Readable } from "stream";

export interface DriveFileStream {
  stream: Readable;
  mimeType: string;
  fileName: string;
  fileSize?: string | null;
}

/**
 * Extracts the Google Drive file ID from common Drive URL formats:
 *  - https://drive.google.com/uc?id=FILE_ID
 *  - https://drive.google.com/uc?export=view&id=FILE_ID
 *  - https://drive.google.com/file/d/FILE_ID/view
 *  - https://drive.google.com/open?id=FILE_ID
 */
const extractDriveFileId = (rawUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError("Provided URL is not a valid URL.", 400);
  }

  const idParam = parsed.searchParams.get("id");
  if (idParam) return idParam;

  const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
  if (match) return match[1];

  throw new AppError(
    "Could not extract a valid Google Drive file ID from the provided URL.",
    400,
  );
};

export class FileProxyService {
  /**
   * Resolves a Google Drive URL to a readable stream + metadata.
   * Throws an AppError for invalid URLs or Drive API failures.
   */
  static async getFileStream(encodedUrl: string): Promise<DriveFileStream> {
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(encodedUrl);
    } catch {
      throw new AppError(
        "Invalid URL encoding for query parameter: url",
        400,
      );
    }

    const fileId = extractDriveFileId(decodedUrl);

    // Fetch metadata first (mimeType, name, size)
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType,name,size",
    });

    const mimeType = meta.data.mimeType ?? "application/octet-stream";
    const fileName = meta.data.name ?? fileId;
    const fileSize = meta.data.size;

    // Fetch the actual file content as a stream
    const driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );

    return {
      stream: driveRes.data as Readable,
      mimeType,
      fileName,
      fileSize,
    };
  }
}
