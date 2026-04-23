import { Request, Response } from "express";
import { catchAsync } from "#src/utils/catchAsync";
import { FileProxyService } from "#src/modules/files/services/fileProxyService";
import { FileProxyQuery } from "#src/modules/files/validators/fileProxyValidators";

export class FileProxyController {
  /**
   * GET /api/v1/files/proxy?url=<encoded_drive_url>
   * Streams a Google Drive file through the backend to the client.
   */
  static proxyDriveFile = catchAsync(async (req: Request, res: Response) => {
    const { url } = req.query as unknown as FileProxyQuery;

    const { stream, mimeType, fileName, fileSize } =
      await FileProxyService.getFileStream(url);

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );
    if (fileSize) {
      res.setHeader("Content-Length", fileSize);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    stream.pipe(res);
  });
}
