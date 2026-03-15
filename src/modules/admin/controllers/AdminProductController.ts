import { Request, Response } from "express";
import { AdminProductService } from "#src/modules/admin/services/AdminProductService";
import { catchAsync } from "#src/utils/catchAsync";
import { sendSuccess } from "#src/utils/apiResponse";

export class AdminProductController {
  static getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const products = await AdminProductService.getAllProducts();

    sendSuccess(res, 200, "Products fetched successfully", {
      results: products.length,
      products,
    });
  });

  static getProduct = catchAsync(async (req: Request, res: Response) => {
    const product = await AdminProductService.getProductById(
      req.params.id as string,
    );

    sendSuccess(res, 200, "Product fetched successfully", {
      product,
    });
  });

  static createProduct = catchAsync(async (req: Request, res: Response) => {
    const newProduct = await AdminProductService.createProduct(req.body);

    sendSuccess(res, 201, "Product created successfully.", {
      product: newProduct,
    });
  });

  static updateProduct = catchAsync(async (req: Request, res: Response) => {
    const updatedProduct = await AdminProductService.updateProduct(
      req.params.id as string,
      req.body,
    );

    sendSuccess(res, 200, "Product updated successfully.", {
      product: updatedProduct,
    });
  });

  static deleteProduct = catchAsync(async (req: Request, res: Response) => {
    await AdminProductService.deleteProduct(req.params.id as string);

    sendSuccess(res, 200, "Product deleted successfully.");
  });
}
