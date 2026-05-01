import { ProductAdminService } from "../services/productAdminService";
import { Product } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { SlicingJob } from "#src/models/SlicingJob";
import { Upload } from "#src/models/Upload";
import { AppError } from "#src/utils/AppError";

jest.mock("#src/models/Product");
jest.mock("#src/models/Design");
jest.mock("#src/models/SlicingJob");
jest.mock("#src/models/Upload");

const mockDesign = {
  _id: "design123",
  fileUrl: "https://example.com/files/model.stl",
  isPrintable: true,
};

const completedSlicingJob = {
  _id: "job123",
  designId: "design123",
  status: "Completed",
  gcodeUrl: "https://example.com/gcode/model.gcode",
  material: "PLA",
  color: "White",
  preset: "normal",
  scale: 100,
  weight: 35,
  dimensions: { width: 50, height: 80, depth: 50 },
  printTime: 120,
  calculatedPrice: 18.5,
  finishedAt: new Date("2026-01-10T08:00:00Z"),
};

const baseInput = {
  name: "Test Product",
  linkedDesignId: "design123",
  slicingJobId: "job123",
};

describe("ProductAdminService.createProduct", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates product with printingProperties and slicingResult derived from the slicing job", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue(completedSlicingJob);
    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Upload.findOne as jest.Mock).mockResolvedValue(null);
    (Product.create as jest.Mock).mockResolvedValue({ _id: "product123", ...baseInput });

    const result = await ProductAdminService.createProduct(baseInput);

    expect(result).toBeDefined();
    expect(Product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slicingJobId: completedSlicingJob._id,
        printingProperties: expect.objectContaining({
          material: "PLA",
          color: "White",
          preset: "normal",
          scale: 100,
        }),
        slicingResult: expect.objectContaining({
          gcodeUrl: completedSlicingJob.gcodeUrl,
          weight: completedSlicingJob.weight,
          calculatedPrice: completedSlicingJob.calculatedPrice,
        }),
      }),
    );
  });

  it("throws when slicing job not found", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue(null);

    await expect(ProductAdminService.createProduct(baseInput)).rejects.toThrow(
      "Slicing job not found.",
    );
  });

  it("throws when slicing job is not Completed", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue({
      ...completedSlicingJob,
      status: "Processing",
    });

    await expect(ProductAdminService.createProduct(baseInput)).rejects.toThrow(
      "Slicing job must be Completed",
    );
  });

  it("throws when slicing job does not belong to the specified design", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue({
      ...completedSlicingJob,
      designId: "other-design",
    });
    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);

    await expect(ProductAdminService.createProduct(baseInput)).rejects.toThrow(
      "Slicing job does not belong to the specified design.",
    );
  });

  it("throws when design is not printable", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue(completedSlicingJob);
    (Design.findById as jest.Mock).mockResolvedValue({
      ...mockDesign,
      isPrintable: false,
    });

    await expect(ProductAdminService.createProduct(baseInput)).rejects.toThrow(
      "Linked Design is not printable.",
    );
  });

  it("throws when image was not uploaded to storage", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue(completedSlicingJob);
    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Upload.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      ProductAdminService.createProduct({
        ...baseInput,
        images: ["https://example.com/image.jpg"],
      }),
    ).rejects.toThrow("Image URL was not uploaded to our storage");
  });

  it("marks images as used after successful creation", async () => {
    (SlicingJob.findById as jest.Mock).mockResolvedValue(completedSlicingJob);
    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Upload.findOne as jest.Mock).mockResolvedValue({ fileUrl: "https://example.com/image.jpg" });
    (Product.create as jest.Mock).mockResolvedValue({ _id: "product123" });
    (Upload.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

    await ProductAdminService.createProduct({
      ...baseInput,
      images: ["https://example.com/image.jpg"],
    });

    expect(Upload.updateMany).toHaveBeenCalledWith(
      { fileUrl: { $in: ["https://example.com/image.jpg"] } },
      { isUsed: true },
    );
  });
});
