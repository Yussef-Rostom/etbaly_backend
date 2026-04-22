// Feature: auto-slicing-on-product-creation
import { ProductAdminService } from "../services/productAdminService";
import { Product } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { ManufacturingJob } from "#src/models/ManufacturingJob";
import { Upload } from "#src/models/Upload";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { AppError } from "#src/utils/AppError";

// Mock dependencies
jest.mock("#src/models/Product");
jest.mock("#src/models/Design");
jest.mock("#src/models/ManufacturingJob");
jest.mock("#src/models/Upload");
jest.mock("#src/utils/queueManager", () => ({
  queueManager: {
    getQueue: jest.fn(),
  },
  QUEUE_NAMES: {
    SLICING: "SLICING"
  }
}));

describe("ProductAdminService Helper Functions", () => {
  describe("extractFileName", () => {
    // Feature: auto-slicing-on-product-creation, Requirement 4.2
    it("extracts filename from a simple URL", () => {
      // Use reflection to access private method
      const extractFileName = (ProductAdminService as any).extractFileName;
      
      const fileUrl = "https://example.com/files/model.stl";
      const result = extractFileName(fileUrl);
      
      expect(result).toBe("model.stl");
    });

    // Feature: auto-slicing-on-product-creation, Requirement 4.2
    it("extracts filename from URL with nested paths", () => {
      const extractFileName = (ProductAdminService as any).extractFileName;
      
      const fileUrl = "https://storage.googleapis.com/bucket/designs/2024/model-v2.stl";
      const result = extractFileName(fileUrl);
      
      expect(result).toBe("model-v2.stl");
    });

    // Feature: auto-slicing-on-product-creation, Requirement 4.2
    it("extracts filename from URL with query parameters", () => {
      const extractFileName = (ProductAdminService as any).extractFileName;
      
      const fileUrl = "https://drive.google.com/file/d/abc123/view?usp=sharing";
      const result = extractFileName(fileUrl);
      
      expect(result).toBe("view");
    });

    // Feature: auto-slicing-on-product-creation, Requirement 4.2
    it("extracts filename with special characters", () => {
      const extractFileName = (ProductAdminService as any).extractFileName;
      
      const fileUrl = "https://example.com/files/my-model_v1.2.stl";
      const result = extractFileName(fileUrl);
      
      expect(result).toBe("my-model_v1.2.stl");
    });

    // Feature: auto-slicing-on-product-creation, Requirement 4.2
    it("handles URL with trailing slash", () => {
      const extractFileName = (ProductAdminService as any).extractFileName;
      
      const fileUrl = "https://example.com/files/model.stl/";
      const result = extractFileName(fileUrl);
      
      expect(result).toBe("");
    });
  });

  describe("generateJobNumber", () => {
    // Feature: auto-slicing-on-product-creation, Requirement 4.3
    it("generates job number with correct format", () => {
      const generateJobNumber = (ProductAdminService as any).generateJobNumber;
      
      const jobNumber = generateJobNumber();
      
      expect(jobNumber).toMatch(/^JOB-\d+-[a-z0-9]{6}$/);
    });

    // Feature: auto-slicing-on-product-creation, Requirement 4.3
    it("generates unique job numbers", () => {
      const generateJobNumber = (ProductAdminService as any).generateJobNumber;
      
      const jobNumber1 = generateJobNumber();
      const jobNumber2 = generateJobNumber();
      
      expect(jobNumber1).not.toBe(jobNumber2);
    });
  });
});

describe("ProductAdminService.createProductWithSlicing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature: auto-slicing-on-product-creation, Requirement 1.1
  it("creates product and manufacturing job with Queued status", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: true,
    };
    const mockProduct = {
      _id: "product123",
      name: "Test Product",
      linkedDesignId: "design123",
    };
    const mockJob = {
      _id: "job123",
      jobNumber: "JOB-123-abc",
      productId: "product123",
      status: "Queued",
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Product.create as jest.Mock).mockResolvedValue(mockProduct);
    (ManufacturingJob.create as jest.Mock).mockResolvedValue(mockJob);
    const mockQueue = { add: jest.fn().mockResolvedValue({ id: "mock-123" }) };
    (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

    const result = await ProductAdminService.createProductWithSlicing({
      name: "Test Product",
      linkedDesignId: "design123",
      currentBasePrice: 100,
      stockLevel: 10,
    });

    expect(result).toEqual(mockProduct);
    expect(ManufacturingJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product123",
        status: "Queued",
      })
    );
  });

  // Feature: auto-slicing-on-product-creation, Requirement 1.2, 1.3
  it("creates job with design fileUrl and fileName", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: true,
    };
    const mockProduct = {
      _id: "product123",
      linkedDesignId: "design123",
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Product.create as jest.Mock).mockResolvedValue(mockProduct);
    (ManufacturingJob.create as jest.Mock).mockResolvedValue({ _id: "job123" });
    const mockQueue = { add: jest.fn().mockResolvedValue({ id: "mock-123" }) };
    (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

    await ProductAdminService.createProductWithSlicing({
      name: "Test Product",
      linkedDesignId: "design123",
      currentBasePrice: 100,
      stockLevel: 10,
    });

    expect(ManufacturingJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stlFileUrl: "https://example.com/files/model.stl",
        fileName: "model.stl",
      })
    );
  });

  // Feature: auto-slicing-on-product-creation, Requirement 1.4
  it("dispatches job to slicing queue", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: true,
    };
    const mockProduct = {
      _id: "product123",
      linkedDesignId: "design123",
    };
    const mockJob = {
      _id: "job123",
      jobNumber: "JOB-123-abc",
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Product.create as jest.Mock).mockResolvedValue(mockProduct);
    (ManufacturingJob.create as jest.Mock).mockResolvedValue(mockJob);
    const mockQueue = { add: jest.fn().mockResolvedValue({ id: "mock-123" }) };
    (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

    await ProductAdminService.createProductWithSlicing({
      name: "Test Product",
      linkedDesignId: "design123",
      currentBasePrice: 100,
      stockLevel: 10,
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      "slice-model",
      expect.objectContaining({
        designId: "job123",
        modelFileKey: "model.stl",
        correlationId: expect.any(String)
      })
    );
  });

  // Feature: auto-slicing-on-product-creation, Requirement 1.5
  it("throws error when design has no fileUrl", async () => {
    const mockDesign = {
      _id: "design123",
      isPrintable: true,
      fileUrl: undefined,
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);

    await expect(
      ProductAdminService.createProductWithSlicing({
        name: "Test Product",
        linkedDesignId: "design123",
        currentBasePrice: 100,
        stockLevel: 10,
      })
    ).rejects.toThrow("Linked Design must have a file URL for slicing.");
  });

  // Feature: auto-slicing-on-product-creation, Requirement 5.4
  it("throws error when design is not printable", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: false,
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);

    await expect(
      ProductAdminService.createProductWithSlicing({
        name: "Test Product",
        linkedDesignId: "design123",
        currentBasePrice: 100,
        stockLevel: 10,
      })
    ).rejects.toThrow("Linked Design is not printable.");
  });

  // Feature: auto-slicing-on-product-creation, Requirement 5.1
  it("rolls back product creation when job creation fails", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: true,
    };
    const mockProduct = {
      _id: "product123",
      linkedDesignId: "design123",
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Product.create as jest.Mock).mockResolvedValue(mockProduct);
    (ManufacturingJob.create as jest.Mock).mockRejectedValue(new Error("Job creation failed"));
    (Product.findByIdAndDelete as jest.Mock).mockResolvedValue(mockProduct);

    await expect(
      ProductAdminService.createProductWithSlicing({
        name: "Test Product",
        linkedDesignId: "design123",
        currentBasePrice: 100,
        stockLevel: 10,
      })
    ).rejects.toThrow("Job creation failed");

    expect(Product.findByIdAndDelete).toHaveBeenCalledWith("product123");
  });

  // Feature: auto-slicing-on-product-creation, Requirement 5.2
  it("rolls back product creation when dispatch fails", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: true,
    };
    const mockProduct = {
      _id: "product123",
      linkedDesignId: "design123",
    };
    const mockJob = {
      _id: "job123",
      jobNumber: "JOB-123-abc",
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Product.create as jest.Mock).mockResolvedValue(mockProduct);
    (ManufacturingJob.create as jest.Mock).mockResolvedValue(mockJob);
    const mockQueue = { add: jest.fn().mockRejectedValue(new Error("Dispatch failed")) };
    (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);
    (Product.findByIdAndDelete as jest.Mock).mockResolvedValue(mockProduct);

    await expect(
      ProductAdminService.createProductWithSlicing({
        name: "Test Product",
        linkedDesignId: "design123",
        currentBasePrice: 100,
        stockLevel: 10,
      })
    ).rejects.toThrow("Dispatch failed");

    expect(Product.findByIdAndDelete).toHaveBeenCalledWith("product123");
  });

  // Feature: auto-slicing-on-product-creation, Requirement 5.3
  it("handles image upload tracking correctly", async () => {
    const mockDesign = {
      _id: "design123",
      fileUrl: "https://example.com/files/model.stl",
      isPrintable: true,
    };
    const mockProduct = {
      _id: "product123",
      linkedDesignId: "design123",
    };
    const mockJob = {
      _id: "job123",
      jobNumber: "JOB-123-abc",
    };
    const mockUpload = {
      fileUrl: "https://example.com/image.jpg",
      isUsed: false,
    };

    (Design.findById as jest.Mock).mockResolvedValue(mockDesign);
    (Upload.findOne as jest.Mock).mockResolvedValue(mockUpload);
    (Product.create as jest.Mock).mockResolvedValue(mockProduct);
    (ManufacturingJob.create as jest.Mock).mockResolvedValue(mockJob);
    const mockQueue = { add: jest.fn().mockResolvedValue({ id: "mock-123" }) };
    (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);
    (Upload.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

    await ProductAdminService.createProductWithSlicing({
      name: "Test Product",
      linkedDesignId: "design123",
      currentBasePrice: 100,
      stockLevel: 10,
      images: ["https://example.com/image.jpg"],
    });

    expect(Upload.findOne).toHaveBeenCalledWith({ fileUrl: "https://example.com/image.jpg" });
    expect(Upload.updateMany).toHaveBeenCalledWith(
      { fileUrl: { $in: ["https://example.com/image.jpg"] } },
      { isUsed: true }
    );
  });
});

describe("ProductAdminService.updateProductGcode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature: auto-slicing-on-product-creation, Requirement 3.1, 3.2
  it("updates product with gcodeUrl and isPrintingReady", async () => {
    (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      _id: "product123",
      gcodeUrl: "https://example.com/gcode/model.gcode",
      isPrintingReady: true,
    });

    await ProductAdminService.updateProductGcode("product123", "https://example.com/gcode/model.gcode");

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith("product123", {
      gcodeUrl: "https://example.com/gcode/model.gcode",
      isPrintingReady: true,
    });
  });
});
