import { Request, Response } from "express";
import { CatalogService } from "../services/CatalogService";
import { catchAsync } from "../../../utils/catchAsync";
import { sendSuccess } from "../../../utils/apiResponse";

export class CatalogController {
  static getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const { products, total } = await CatalogService.getActiveProducts(
      req.query,
    );

    sendSuccess(res, 200, "Active products fetched successfully", {
      total,
      results: products.length,
      products,
    });
  });

  static getProduct = catchAsync(async (req: Request, res: Response) => {
    const product = await CatalogService.getActiveProductById(
      req.params.id as string,
    );

    sendSuccess(res, 200, "Product fetched successfully", {
      product,
    });
  });
}
