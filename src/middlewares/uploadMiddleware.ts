import multer from "multer";
import { multerConfig } from "../configs/multerConfig";

export const uploadMedia = multer(multerConfig);
