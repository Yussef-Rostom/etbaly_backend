// Feature: auto-slicing-on-product-creation
import { processSlicingJob } from "../slicingMockWorker";
import { ManufacturingService } from "#src/modules/manufacturing/services/manufacturingAdminService";
import { ProductAdminService } from "#src/modules/product/services/productAdminService";

// Mock dependencies
jest.mock("#src/modules/manufacturing/services/manufacturingAdminService");
jest.mock("#src/modules/product/services/productAdminService");

describe("processSlicingJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Feature: auto-slicing-on-product-creation, Requirement 2.1, 2.2, 2.3
  it("processes slicing job and updates job status", async () => {
    const mockData = {
      manufacturingJobId: "job123",
      fileName: "model.stl",
    };
    const mockGcodeUrl = "https://example.com/gcode/model.gcode";

    (ManufacturingService.updateJobStatus as jest.Mock).mockResolvedValue(undefined);
    (ManufacturingService.simulateSlicing as jest.Mock).mockResolvedValue(mockGcodeUrl);

    await processSlicingJob(mockData);

    expect(ManufacturingService.updateJobStatus).toHaveBeenCalledWith("job123", "Slicing");
    expect(ManufacturingService.simulateSlicing).toHaveBeenCalledWith("model.stl");
    expect(ManufacturingService.updateJobStatus).toHaveBeenCalledWith("job123", "Done", mockGcodeUrl);
  });

  // Feature: auto-slicing-on-product-creation, Requirement 3.1, 3.2
  it("updates product with gcode URL when productId is provided", async () => {
    const mockData = {
      manufacturingJobId: "job123",
      fileName: "model.stl",
      productId: "product123",
    };
    const mockGcodeUrl = "https://example.com/gcode/model.gcode";

    (ManufacturingService.updateJobStatus as jest.Mock).mockResolvedValue(undefined);
    (ManufacturingService.simulateSlicing as jest.Mock).mockResolvedValue(mockGcodeUrl);
    (ProductAdminService.updateProductGcode as jest.Mock).mockResolvedValue(undefined);

    await processSlicingJob(mockData);

    expect(ProductAdminService.updateProductGcode).toHaveBeenCalledWith("product123", mockGcodeUrl);
  });

  // Feature: auto-slicing-on-product-creation, Requirement 6.3
  it("does not update product when productId is not provided (order-based job)", async () => {
    const mockData = {
      manufacturingJobId: "job123",
      fileName: "model.stl",
    };
    const mockGcodeUrl = "https://example.com/gcode/model.gcode";

    (ManufacturingService.updateJobStatus as jest.Mock).mockResolvedValue(undefined);
    (ManufacturingService.simulateSlicing as jest.Mock).mockResolvedValue(mockGcodeUrl);

    await processSlicingJob(mockData);

    expect(ProductAdminService.updateProductGcode).not.toHaveBeenCalled();
  });

  // Feature: auto-slicing-on-product-creation, Requirement 2.4
  it("updates job status to Failed when slicing fails", async () => {
    const mockData = {
      manufacturingJobId: "job123",
      fileName: "model.stl",
    };

    (ManufacturingService.updateJobStatus as jest.Mock).mockResolvedValue(undefined);
    (ManufacturingService.simulateSlicing as jest.Mock).mockRejectedValue(new Error("Slicing failed"));

    await processSlicingJob(mockData);

    expect(ManufacturingService.updateJobStatus).toHaveBeenCalledWith("job123", "Failed");
  });

  // Feature: auto-slicing-on-product-creation, Requirement 3.4
  it("does not update product when slicing fails", async () => {
    const mockData = {
      manufacturingJobId: "job123",
      fileName: "model.stl",
      productId: "product123",
    };

    (ManufacturingService.updateJobStatus as jest.Mock).mockResolvedValue(undefined);
    (ManufacturingService.simulateSlicing as jest.Mock).mockRejectedValue(new Error("Slicing failed"));

    await processSlicingJob(mockData);

    expect(ProductAdminService.updateProductGcode).not.toHaveBeenCalled();
  });

  // Feature: auto-slicing-on-product-creation, Requirement 6.3
  it("handles product update failure gracefully and marks job as failed", async () => {
    const mockData = {
      manufacturingJobId: "job123",
      fileName: "model.stl",
      productId: "product123",
    };
    const mockGcodeUrl = "https://example.com/gcode/model.gcode";

    (ManufacturingService.updateJobStatus as jest.Mock).mockResolvedValue(undefined);
    (ManufacturingService.simulateSlicing as jest.Mock).mockResolvedValue(mockGcodeUrl);
    (ProductAdminService.updateProductGcode as jest.Mock).mockRejectedValue(
      new Error("Product update failed")
    );

    // Should not throw - error is caught and logged
    await processSlicingJob(mockData);
    
    // Job status should be updated to Failed when product update fails
    expect(ManufacturingService.updateJobStatus).toHaveBeenCalledWith("job123", "Failed");
  });
});
