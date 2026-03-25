import { Product, IProduct } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { AppError } from "#src/utils/AppError";
import { uploadImage } from "#src/utils/drive";
import { APIFeatures } from "#src/utils/apiFeatures";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "#src/modules/product/validators/productAdminValidators";

export class ProductAdminService {
  static async getAllProducts(query: Record<string, any>): Promise<IProduct[]> {
    const features = new APIFeatures(
      Product.find().populate("linkedDesignId", "name isPrintable fileUrl"),
      query,
    )
      .filter()
      .search(["name", "description"])
      .sort()
      .paginate();

    return features.query;
  }

  static async getProductById(productId: string): Promise<IProduct> {
    const product = await Product.findById(productId).populate(
      "linkedDesignId",
      "name isPrintable fileUrl",
    );
    if (!product) throw new AppError("Product not found.", 404);
    return product;
  }

  static async uploadProductImage(file: Express.Multer.File): Promise<string> {
    const fileUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    const url = new URL(fileUrl);
    const driveFileId = url.searchParams.get("id")!;

    await Upload.findOneAndUpdate(
      { driveFileId },
      { driveFileId, fileUrl, isUsed: false },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return fileUrl;
  }

  static async createProduct(data: CreateProductInput): Promise<IProduct> {
    const design = await Design.findById(data.linkedDesignId);
    if (!design) throw new AppError("Linked Design not found.", 404);
    if (!design.isPrintable) throw new AppError("Linked Design is not printable.", 400);

    if (data.images?.length) {
      for (const imageUrl of data.images) {
        const tracker = await Upload.findOne({ fileUrl: imageUrl });
        if (!tracker) {
          throw new AppError(`Image URL was not uploaded to our storage: ${imageUrl}`, 400);
        }
      }
    }

    const product = await Product.create(data);

    if (data.images?.length) {
      await Upload.updateMany({ fileUrl: { $in: data.images } }, { isUsed: true });
    }

    return product;
  }

  static async updateProduct(
    productId: string,
    data: UpdateProductInput,
  ): Promise<IProduct> {
    if (data.linkedDesignId) {
      const design = await Design.findById(data.linkedDesignId);
      if (!design) throw new AppError("Linked Design not found.", 404);
    }

    if (data.images?.length) {
      for (const imageUrl of data.images) {
        const tracker = await Upload.findOne({ fileUrl: imageUrl });
        if (!tracker) {
          throw new AppError(`Image URL was not uploaded to our storage: ${imageUrl}`, 400);
        }
      }
    }

    const product = await Product.findByIdAndUpdate(productId, data, {
      new: true,
      runValidators: true,
    }).populate("linkedDesignId", "name isPrintable fileUrl");

    if (!product) throw new AppError("Product not found.", 404);

    if (data.images?.length) {
      await Upload.updateMany({ fileUrl: { $in: data.images } }, { isUsed: true });
    }

    return product;
  }

  static async deleteProduct(productId: string): Promise<void> {
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found.", 404);

    // Mark all product images as unused for garbage collection
    if (product.images.length) {
      await Upload.updateMany({ fileUrl: { $in: product.images } }, { isUsed: false });
    }

    await product.deleteOne();
  }
}
