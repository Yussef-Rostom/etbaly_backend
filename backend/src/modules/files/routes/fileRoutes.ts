import { Router } from "express";
import { FileProxyController } from "#src/modules/files/controllers/fileProxyController";
import { validate } from "#src/middlewares/validate";
import { fileProxyQuerySchema } from "#src/modules/files/validators/fileProxyValidators";

const router = Router();

// GET /api/v1/files/proxy?url=<encoded_drive_url>
router.get(
  "/proxy",
  validate(fileProxyQuerySchema, "query"),
  FileProxyController.proxyDriveFile,
);

export default router;
