import { Request, Response } from "express";
import { ProductService } from "#src/modules/product/services/ProductService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class ProductController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const { products, total } = await ProductService.getActiveProducts(req.query);

    sendSuccess(res, 200, "Products fetched successfully", {
      total,
      results: products.length,
      products,
    });
  });

  static getOne = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.getActiveProductById(req.params.id as string);

    sendSuccess(res, 200, "Product fetched successfully", { product });
  });
}
