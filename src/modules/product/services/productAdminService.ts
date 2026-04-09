import { Product, IProduct, validateCustomizability } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { ManufacturingJob } from "#src/models/ManufacturingJob";
import { AppError } from "#src/utils/AppError";
import { uploadImage } from "#src/utils/drive";
import { APIFeatures } from "#src/utils/apiFeatures";
import { dispatchJob } from "#src/utils/queueManager";
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

    // Validate customization consistency
    validateCustomizability(data.isCustomizable ?? false, data.customFields);

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

    // Validate customization consistency if either field is being updated
    if (data.isCustomizable !== undefined || data.customFields !== undefined) {
      const existingProduct = await Product.findById(productId);
      if (!existingProduct) throw new AppError("Product not found.", 404);
      
      const isCustomizable = data.isCustomizable ?? existingProduct.isCustomizable;
      const customFields = data.customFields ?? existingProduct.customFields;
      
      validateCustomizability(isCustomizable, customFields);
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

  /**
   * Create a product with automatic slicing job creation and dispatch.
   * Validates linked design exists and has fileUrl, creates product record,
   * creates ManufacturingJob with status "Queued", and dispatches job to slicing queue.
   * Implements rollback on job creation or dispatch failure.
   * 
   * @param data - Product creation input data
   * @returns Created product
   * @throws AppError if design not found, not printable, or missing fileUrl
   * @throws Error if job creation or dispatch fails (triggers rollback)
   */
  static async createProductWithSlicing(data: CreateProductInput): Promise<IProduct> {
    // Validate design exists and has fileUrl
    const design = await Design.findById(data.linkedDesignId);
    if (!design) throw new AppError("Linked Design not found.", 404);
    if (!design.isPrintable) throw new AppError("Linked Design is not printable.", 400);
    if (!design.fileUrl) throw new AppError("Linked Design must have a file URL for slicing.", 400);

    // Validate customization consistency
    validateCustomizability(data.isCustomizable ?? false, data.customFields);

    // Handle image upload tracking (existing logic)
    if (data.images?.length) {
      for (const imageUrl of data.images) {
        const tracker = await Upload.findOne({ fileUrl: imageUrl });
        if (!tracker) {
          throw new AppError(`Image URL was not uploaded to our storage: ${imageUrl}`, 400);
        }
      }
    }

    // Create product record
    const product = await Product.create(data);

    try {
      // Create ManufacturingJob with status "Queued"
      const jobNumber = this.generateJobNumber();
      const fileName = this.extractFileName(design.fileUrl);
      
      const job = await ManufacturingJob.create({
        jobNumber,
        productId: product._id,
        status: "Queued",
        stlFileUrl: design.fileUrl,
        fileName,
      });

      // Dispatch job to slicing queue using dispatchJob
      await dispatchJob("slicing-tasks", "slice-model", {
        manufacturingJobId: job._id.toString(),
        fileName,
        productId: product._id.toString(),
      });

      // Mark images as used after successful job creation and dispatch
      if (data.images?.length) {
        await Upload.updateMany({ fileUrl: { $in: data.images } }, { isUsed: true });
      }

      return product;
    } catch (error) {
      // Implement rollback on job creation or dispatch failure
      await Product.findByIdAndDelete(product._id);
      throw error;
    }
  }

  /**
   * Update product with G-code URL and mark as printing ready.
   * Called by slicing worker when slicing completes successfully.
   * 
   * @param productId - Product ID to update
   * @param gcodeUrl - Generated G-code URL
   */
  static async updateProductGcode(productId: string, gcodeUrl: string): Promise<void> {
    await Product.findByIdAndUpdate(productId, {
      gcodeUrl,
      isPrintingReady: true,
    });
  }

    /**
     * Generate unique job number with format "JOB-{timestamp}-{random6}"
     * @returns Unique job number string
     */
    private static generateJobNumber(): string {
      const timestamp = Date.now();
      const random6 = Math.random().toString(36).substring(2, 8);
      return `JOB-${timestamp}-${random6}`;
    }

    /**
     * Extract filename from a file URL
     * @param fileUrl - The URL to extract filename from
     * @returns The filename extracted from the URL pathname
     */
    private static extractFileName(fileUrl: string): string {
      const url = new URL(fileUrl);
      const pathname = url.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    }

}
