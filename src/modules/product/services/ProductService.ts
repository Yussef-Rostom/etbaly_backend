import { Product, IProduct } from "#src/models/Product";
import { AppError } from "#src/utils/AppError";
import { APIFeatures } from "#src/utils/apiFeatures";

export class ProductService {
  static async getActiveProducts(
    queryStr: Record<string, any>,
  ): Promise<{ products: IProduct[]; total: number }> {
    const searchFields = ["name", "description"];
    const baseFilter = { isActive: true };

    const features = new APIFeatures(Product.find(baseFilter), queryStr)
      .filter()
      .search(searchFields)
      .sort()
      .limitFields()
      .paginate();

    const countFeatures = new APIFeatures(Product.find(baseFilter), queryStr)
      .filter()
      .search(searchFields);

    const [products, total] = await Promise.all([
      features.query,
      countFeatures.query.countDocuments(),
    ]);

    return { products, total };
  }

  static async getActiveProductById(productId: string): Promise<IProduct> {
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      throw new AppError("Product not found or not currently active.", 404);
    }
    return product;
  }
}
