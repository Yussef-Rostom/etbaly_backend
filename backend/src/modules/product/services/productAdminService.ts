import { Product, IProduct, validateCustomizability } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { Upload } from "#src/models/Upload";
import { SlicingJob } from "#src/models/SlicingJob";
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

  static async uploadProductImage(
    file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileId: string }> {
    const { fileId, publicUrl } = await uploadImage(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    await Upload.findOneAndUpdate(
      { driveFileId: fileId },
      { driveFileId: fileId, fileUrl: publicUrl, isUsed: false },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    return { fileUrl: publicUrl, fileId };
  }

  /**
   * Creates a product from a completed slicing job.
   *
   * Workflow:
   *   1. Validate the slicing job exists and is Completed
   *   2. Validate the linked design matches the slicing job's design
   *   3. Copy printingProperties and slicingResult from the job
   *   4. Persist the product with slicingJobId reference
   *
   * @param data - Validated product creation input (must include slicingJobId)
   * @returns The created product document
   */
  static async createProduct(data: CreateProductInput): Promise<IProduct> {
    // 1. Validate slicing job
    const slicingJob = await SlicingJob.findById(data.slicingJobId);
    if (!slicingJob) throw new AppError("Slicing job not found.", 404);
    if (slicingJob.status !== "Completed") {
      throw new AppError(
        `Slicing job must be Completed before creating a product. Current status: ${slicingJob.status}`,
        400,
      );
    }
    if (!slicingJob.gcodeUrl) {
      throw new AppError("Slicing job is missing G-code URL.", 400);
    }

    // 2. Validate design
    const design = await Design.findById(data.linkedDesignId);
    if (!design) throw new AppError("Linked Design not found.", 404);
    if (!design.isPrintable) throw new AppError("Linked Design is not printable.", 400);

    // 3. Ensure the slicing job belongs to this design
    if (slicingJob.designId.toString() !== design._id.toString()) {
      throw new AppError(
        "Slicing job does not belong to the specified design.",
        400,
      );
    }

    // 4. Validate customization consistency
    validateCustomizability(data.isCustomizable ?? false, data.customFields);

    // 5. Validate image provenance
    if (data.images?.length) {
      for (const imageUrl of data.images) {
        const tracker = await Upload.findOne({ fileUrl: imageUrl });
        if (!tracker) {
          throw new AppError(
            `Image URL was not uploaded to our storage: ${imageUrl}`,
            400,
          );
        }
      }
    }

    // 6. Derive printingProperties and slicingResult from the job
    const printingProperties = {
      material: slicingJob.material,
      color: slicingJob.color,
      scale: slicingJob.scale ?? 100,
      preset: slicingJob.preset as "heavy" | "normal" | "draft" | undefined,
    };

    const slicingResult = {
      gcodeUrl: slicingJob.gcodeUrl,
      dimensions: slicingJob.dimensions ?? { width: 0, height: 0, depth: 0 },
      weight: slicingJob.weight ?? 0,
      printTime: slicingJob.printTime ?? 0,
      calculatedPrice: slicingJob.calculatedPrice ?? 0,
      slicedAt: slicingJob.finishedAt ?? new Date(),
    };

    // 7. Create product
    const product = await Product.create({
      name: data.name,
      description: data.description,
      images: data.images ?? [],
      isActive: data.isActive ?? true,
      linkedDesignId: design._id,
      slicingJobId: slicingJob._id,
      printingProperties,
      slicingResult,
      isCustomizable: data.isCustomizable ?? false,
      customFields: data.customFields,
    });

    // 8. Mark images as used
    if (data.images?.length) {
      await Upload.updateMany(
        { fileUrl: { $in: data.images } },
        { isUsed: true },
      );
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

    // If slicingJobId is being updated, re-derive printingProperties + slicingResult
    let derivedFields: Record<string, any> = {};
    if (data.slicingJobId) {
      const slicingJob = await SlicingJob.findById(data.slicingJobId);
      if (!slicingJob) throw new AppError("Slicing job not found.", 404);
      if (slicingJob.status !== "Completed") {
        throw new AppError(
          `Slicing job must be Completed. Current status: ${slicingJob.status}`,
          400,
        );
      }
      if (!slicingJob.gcodeUrl) {
        throw new AppError("Slicing job is missing G-code URL.", 400);
      }

      derivedFields.printingProperties = {
        material: slicingJob.material,
        color: slicingJob.color,
        scale: slicingJob.scale ?? 100,
        preset: slicingJob.preset,
      };
      derivedFields.slicingResult = {
        gcodeUrl: slicingJob.gcodeUrl,
        dimensions: slicingJob.dimensions ?? { width: 0, height: 0, depth: 0 },
        weight: slicingJob.weight ?? 0,
        printTime: slicingJob.printTime ?? 0,
        calculatedPrice: slicingJob.calculatedPrice ?? 0,
        slicedAt: slicingJob.finishedAt ?? new Date(),
      };
    }

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
          throw new AppError(
            `Image URL was not uploaded to our storage: ${imageUrl}`,
            400,
          );
        }
      }
    }

    // Strip printingProperties from data (always derived from slicingJob)
    const { ...updateData } = data as any;
    delete updateData.printingProperties;

    const product = await Product.findByIdAndUpdate(
      productId,
      { ...updateData, ...derivedFields },
      { returnDocument: "after", runValidators: true },
    ).populate("linkedDesignId", "name isPrintable fileUrl");

    if (!product) throw new AppError("Product not found.", 404);

    if (data.images?.length) {
      await Upload.updateMany(
        { fileUrl: { $in: data.images } },
        { isUsed: true },
      );
    }

    return product;
  }

  static async deleteProduct(productId: string): Promise<void> {
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found.", 404);

    if (product.images.length) {
      await Upload.updateMany(
        { fileUrl: { $in: product.images } },
        { isUsed: false },
      );
    }

    await product.deleteOne();
  }
}
