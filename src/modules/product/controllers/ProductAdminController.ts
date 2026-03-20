import { Request, Response } from "express";
import { ProductAdminService } from "#src/modules/product/services/ProductAdminService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";
import { AppError } from "#src/utils/AppError";

export class ProductAdminController {
  static getAll = catchAsync(async (req: Request, res: Response) => {
    const products = await ProductAdminService.getAllProducts(req.query);

    sendSuccess(res, 200, "Products fetched successfully", {
      results: products.length,
      products,
    });
  });

  static getOne = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductAdminService.getProductById(req.params.id as string);

    sendSuccess(res, 200, "Product fetched successfully", { product });
  });

  static uploadImage = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError("Image file is required.", 400);

    const imageUrl = await ProductAdminService.uploadProductImage(req.file);

    sendSuccess(res, 200, "Product image uploaded successfully.", { imageUrl });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductAdminService.createProduct(req.body);

    sendSuccess(res, 201, "Product created successfully.", { product });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductAdminService.updateProduct(req.params.id as string, req.body);

    sendSuccess(res, 200, "Product updated successfully.", { product });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    await ProductAdminService.deleteProduct(req.params.id as string);

    sendSuccess(res, 200, "Product deleted successfully.");
  });
}
