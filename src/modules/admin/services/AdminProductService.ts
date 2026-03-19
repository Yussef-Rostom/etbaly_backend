import { Product, IProduct } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { AppError } from "#src/utils/AppError";
import { uploadImage } from "#src/utils/drive";
import {
  CreateProductInput,
  UpdateProductInput,
} from "#src/modules/admin/validators/adminProductValidators";

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

  static async uploadProductImage(file: Express.Multer.File): Promise<string> {
    const fileUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    const url = new URL(fileUrl);
    const driveFileId = url.searchParams.get("id")!;

    await Upload.findOneAndUpdate(
      { driveFileId },
      { driveFileId, fileUrl, is_used: false },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return fileUrl;
  }

  static async createProduct(data: CreateProductInput): Promise<IProduct> {
    const design = await Design.findById(data.linkedDesignId);
    if (!design) {
      throw new AppError("Linked Design not found.", 404);
    }

    const product = await Product.create(data);

    // Mark uploaded images as used
    if (data.images?.length) {
      for (const imageUrl of data.images) {
        await Upload.findOneAndUpdate({ fileUrl: imageUrl }, { is_used: true });
      }
    }

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

    // Mark any newly added images as used
    if (data.images?.length) {
      for (const imageUrl of data.images) {
        await Upload.findOneAndUpdate({ fileUrl: imageUrl }, { is_used: true });
      }
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
