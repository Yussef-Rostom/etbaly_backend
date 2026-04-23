import multer from "multer";
import { multerConfig } from "#src/configs/multerConfig";

export const uploadMedia = multer(multerConfig);
