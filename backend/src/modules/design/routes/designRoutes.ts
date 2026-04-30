import { Router } from "express";
import multer from "multer";
import { DesignController } from "../controllers/designController";
import { DesignAdminController } from "../controllers/designAdminController";
import { authMiddleware } from "#src/middlewares/authMiddleware";
import { validate } from "#src/middlewares/validate";
import { uploadDesignSchema } from "#src/modules/design/validators/designValidators";
import { createDesignSchema } from "#src/modules/design/validators/designAdminValidators";

const router = Router();

// Accepts STL, OBJ, 3MF and common 3D file types up to 50 MB
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

// ─── Authenticated user routes ────────────────────────────────────────────────
router.use(authMiddleware);

// POST /api/v1/designs/upload
router.post(
  "/upload",
  uploadDesign.single("file"),
  validate(uploadDesignSchema),
  DesignController.uploadDesign,
);

// POST /api/v1/designs
router.post("/", validate(createDesignSchema), DesignAdminController.create);

router.get("/", DesignController.getAll);
router.get("/slicing-history", DesignController.getSlicingHistory);
router.get("/:id", DesignController.getOne);

export default router;
