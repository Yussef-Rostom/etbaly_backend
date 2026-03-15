import { Product, IProduct } from "#src/models/Product";
import { AppError } from "#src/utils/AppError";
import { APIFeatures } from "#src/utils/apiFeatures";

export class CatalogService {
  /** Retrieves all active products with pagination, sorting, and search capabilities. */
  static async getActiveProducts(
    queryStr: Record<string, any>,
  ): Promise<{ products: IProduct[]; total: number }> {
    const searchFields = ["name", "description"];

    const baseQuery = Product.find({ isActive: true });

    const features = new APIFeatures(baseQuery, queryStr)
      .filter()
      .search(searchFields)
      .sort()
      .limitFields()
      .paginate();

    const countFeatures = new APIFeatures(
      Product.find({ isActive: true }),
      queryStr,
    )
      .filter()
      .search(searchFields);

    const [products, total] = await Promise.all([
      features.query,
      countFeatures.query.countDocuments(),
    ]);

    return { products, total };
  }

  /** Retrieves a single active product by ID, throwing an error if not found. */
  static async getActiveProductById(productId: string): Promise<IProduct> {
    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      throw new AppError("Product not found or not currently active.", 404);
    }

    return product;
  }
}
