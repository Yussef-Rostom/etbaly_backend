import { Router } from "express";
import { CatalogController } from "#src/modules/catalog/controllers/CatalogController";

const router = Router();

router.route("/products").get(CatalogController.getAllProducts);

router.route("/products/:id").get(CatalogController.getProduct);

export default router;
