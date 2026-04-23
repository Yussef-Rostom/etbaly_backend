import { Router } from "express";
import multer from "multer";
import { DesignAdminController } from "../controllers/designAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { restrictTo } from "#src/middlewares/roleMiddleware";
import { validate } from "#src/middlewares/validate";
import {
  createDesignSchema,
  updateDesignSchema,
} from "../validators/designAdminValidators";

const router = Router();

const uploadDesign = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "model/stl",
      "application/octet-stream",
      "model/obj",
      "application/vnd.ms-pki.stl",
      "application/sla",
    ];
    if (
      allowed.includes(file.mimetype) ||
      /\.(stl|obj|3mf|ply|amf)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only 3D design files (STL, OBJ, 3MF, PLY, AMF) are allowed."));
    }
  },
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.use(authMiddleware, restrictTo("admin"));

router.post("/upload", uploadDesign.single("file"), DesignAdminController.uploadFile);
router.post("/", validate(createDesignSchema), DesignAdminController.create);
router.patch("/:id", validate(updateDesignSchema), DesignAdminController.update);
router.delete("/:id", DesignAdminController.delete);

export default router;
