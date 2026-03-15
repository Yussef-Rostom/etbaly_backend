import { Product, IProduct } from "../../../models/Product";
import { Design } from "../../../models/Design";
import { AppError } from "../../../utils/AppError";
import {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/adminProductValidators";

export class AdminProductService {
  static async getAllProducts(): Promise<IProduct[]> {
    const products = await Product.find().populate(
      "linkedDesignId",
      "name isPrintable fileUrl",
    );
    return products;
  }

  static async getProductById(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId).populate(
      "linkedDesignId",
      "name isPrintable fileUrl",
    );
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    return product;
  }

  static async createProduct(data: CreateProductInput): Promise<IProduct> {
    const design = await Design.findById(data.linkedDesignId);
    if (!design) {
      throw new AppError("Linked Design not found.", 404);
    }

    const product = await Product.create(data);
    return product;
  }

  static async updateProduct(
    productId: string,
    data: UpdateProductInput,
  ): Promise<IProduct> {
    if (data.linkedDesignId) {
      const design = await Design.findById(data.linkedDesignId);
      if (!design) {
        throw new AppError("Linked Design not found.", 404);
      }
    }

    const product = await Product.findByIdAndUpdate(productId, data, {
      new: true,
      runValidators: true,
    }).populate("linkedDesignId", "name isPrintable fileUrl");

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return product;
  }

  static async deleteProduct(productId: string): Promise<void> {
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
  }
}
