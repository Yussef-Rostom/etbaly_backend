import mongoose from "mongoose";
import { PrintingJob } from "#src/models/PrintingJob";
import { PrintingService } from "../printingService";
import { AppError } from "#src/utils/AppError";

// Mock the PrintingJob model
jest.mock("#src/models/PrintingJob");

describe("PrintingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createPrintingJob", () => {
    it("should create a printing job with Pending Review status", async () => {
      const mockJobData = {
        jobNumber: "PRINT-001",
        productId: new mongoose.Types.ObjectId(),
        gcodeUrl: "https://example.com/file.gcode",
      };

      const mockSavedJob = {
        ...mockJobData,
        status: "Pending Review",
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSave = jest.fn().mockResolvedValue(mockSavedJob);
      (PrintingJob as any).mockImplementation(() => ({
        ...mockJobData,
        status: "Pending Review",
        save: mockSave,
      }));

      const result = await PrintingService.createPrintingJob(mockJobData);

      expect(mockSave).toHaveBeenCalled();
      expect(result.status).toBe("Pending Review");
    });

    it("should throw AppError on duplicate job number", async () => {
      const mockJobData = {
        jobNumber: "PRINT-001",
        productId: new mongoose.Types.ObjectId(),
      };

      const mockSave = jest.fn().mockRejectedValue({ code: 11000 });
      (PrintingJob as any).mockImplementation(() => ({
        ...mockJobData,
        save: mockSave,
      }));

      await expect(PrintingService.createPrintingJob(mockJobData)).rejects.toThrow(
        new AppError("Job number already exists in this collection", 409)
      );
    });

    it("should throw AppError on validation error", async () => {
      const mockJobData = {
        jobNumber: "PRINT-001",
        productId: new mongoose.Types.ObjectId(),
      };

      const mockSave = jest.fn().mockRejectedValue({
        name: "ValidationError",
        message: "Validation failed",
      });
      (PrintingJob as any).mockImplementation(() => ({
        ...mockJobData,
        save: mockSave,
      }));

      await expect(PrintingService.createPrintingJob(mockJobData)).rejects.toThrow(
        new AppError("Validation failed", 400)
      );
    });
  });

  describe("reviewPrintingJob", () => {
    it("should approve a printing job and transition to Queued", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        jobNumber: "PRINT-001",
        status: "Pending Review",
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: "Queued",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);
      (PrintingJob.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedJob);

      const result = await PrintingService.reviewPrintingJob(jobId, "approve");

      expect(PrintingJob.findById).toHaveBeenCalledWith(jobId);
      expect(PrintingJob.findByIdAndUpdate).toHaveBeenCalledWith(
        jobId,
        { status: "Queued" },
        { returnDocument: 'after', runValidators: true }
      );
      expect(result.status).toBe("Queued");
    });

    it("should reject a printing job", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        jobNumber: "PRINT-001",
        status: "Pending Review",
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: "Rejected",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);
      (PrintingJob.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedJob);

      const result = await PrintingService.reviewPrintingJob(jobId, "reject");

      expect(result.status).toBe("Rejected");
    });

    it("should throw AppError if job not found", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(PrintingService.reviewPrintingJob(jobId, "approve")).rejects.toThrow(
        new AppError("PrintingJob not found", 404)
      );
    });

    it("should throw AppError if job is not in Pending Review status", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Queued",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      await expect(PrintingService.reviewPrintingJob(jobId, "approve")).rejects.toThrow(
        new AppError("Invalid status transition. Job must be in 'Pending Review' status.", 400)
      );
    });
  });

  describe("getQueuedPrintingJobs", () => {
    it("should return queued printing jobs", async () => {
      const mockJobs = [
        {
          _id: new mongoose.Types.ObjectId(),
          jobNumber: "PRINT-001",
          status: "Queued",
        },
        {
          _id: new mongoose.Types.ObjectId(),
          jobNumber: "PRINT-002",
          status: "Queued",
        },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockJobs);
      (PrintingJob.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

      const result = await PrintingService.getQueuedPrintingJobs();

      expect(PrintingJob.find).toHaveBeenCalledWith({ status: "Queued" });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockJobs);
    });
  });

  describe("startPrintingJob", () => {
    it("should start a printing job and set startedAt", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Queued",
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: "Processing",
        startedAt: expect.any(Date),
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);
      (PrintingJob.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedJob);

      const result = await PrintingService.startPrintingJob(jobId);

      expect(PrintingJob.findByIdAndUpdate).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          status: "Processing",
          startedAt: expect.any(Date),
        }),
        { returnDocument: 'after', runValidators: true }
      );
      expect(result.status).toBe("Processing");
    });

    it("should start a printing job with machineId", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const machineId = "PRINTER-01";
      const mockJob = {
        _id: jobId,
        status: "Queued",
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: "Processing",
        machineId,
        startedAt: expect.any(Date),
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);
      (PrintingJob.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedJob);

      const result = await PrintingService.startPrintingJob(jobId, machineId);

      expect(PrintingJob.findByIdAndUpdate).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          status: "Processing",
          machineId,
          startedAt: expect.any(Date),
        }),
        { returnDocument: 'after', runValidators: true }
      );
    });

    it("should throw AppError if job not found", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(PrintingService.startPrintingJob(jobId)).rejects.toThrow(
        new AppError("PrintingJob not found", 404)
      );
    });

    it("should throw AppError if job is not in Queued status", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Processing",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      await expect(PrintingService.startPrintingJob(jobId)).rejects.toThrow(
        new AppError("Invalid status transition. Job must be in 'Queued' status.", 400)
      );
    });
  });

  describe("completePrintingJob", () => {
    it("should complete a printing job and set finishedAt", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Processing",
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: "Completed",
        finishedAt: expect.any(Date),
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);
      (PrintingJob.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedJob);

      const result = await PrintingService.completePrintingJob(jobId);

      expect(PrintingJob.findByIdAndUpdate).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          status: "Completed",
          finishedAt: expect.any(Date),
        }),
        { returnDocument: 'after', runValidators: true }
      );
      expect(result.status).toBe("Completed");
    });

    it("should throw AppError if job not found", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(PrintingService.completePrintingJob(jobId)).rejects.toThrow(
        new AppError("PrintingJob not found", 404)
      );
    });

    it("should throw AppError if job is not in Processing status", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Queued",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      await expect(PrintingService.completePrintingJob(jobId)).rejects.toThrow(
        new AppError("Invalid status transition. Job must be in 'Processing' status.", 400)
      );
    });
  });

  describe("failPrintingJob", () => {
    it("should fail a printing job and set finishedAt", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Processing",
      };

      const mockUpdatedJob = {
        ...mockJob,
        status: "Failed",
        finishedAt: expect.any(Date),
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);
      (PrintingJob.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedJob);

      const result = await PrintingService.failPrintingJob(jobId);

      expect(PrintingJob.findByIdAndUpdate).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          status: "Failed",
          finishedAt: expect.any(Date),
        }),
        { returnDocument: 'after', runValidators: true }
      );
      expect(result.status).toBe("Failed");
    });

    it("should throw AppError if job not found", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await expect(PrintingService.failPrintingJob(jobId)).rejects.toThrow(
        new AppError("PrintingJob not found", 404)
      );
    });

    it("should throw AppError if job is not in Processing status", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        status: "Queued",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      await expect(PrintingService.failPrintingJob(jobId)).rejects.toThrow(
        new AppError("Invalid status transition. Job must be in 'Processing' status.", 400)
      );
    });
  });

  describe("getPrintingJobById", () => {
    it("should return a printing job by ID", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: jobId,
        jobNumber: "PRINT-001",
        status: "Queued",
      };

      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(mockJob);

      const result = await PrintingService.getPrintingJobById(jobId);

      expect(PrintingJob.findById).toHaveBeenCalledWith(jobId);
      expect(result).toEqual(mockJob);
    });

    it("should return null for invalid ObjectId", async () => {
      const result = await PrintingService.getPrintingJobById("invalid-id");

      expect(result).toBeNull();
    });

    it("should return null if job not found", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();
      (PrintingJob.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await PrintingService.getPrintingJobById(jobId);

      expect(result).toBeNull();
    });
  });

  describe("listPrintingJobs", () => {
    it("should list all printing jobs without filters", async () => {
      const mockJobs = [
        { _id: new mongoose.Types.ObjectId(), jobNumber: "PRINT-001", status: "Queued" },
        { _id: new mongoose.Types.ObjectId(), jobNumber: "PRINT-002", status: "Processing" },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockJobs);
      (PrintingJob.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

      const result = await PrintingService.listPrintingJobs();

      expect(PrintingJob.find).toHaveBeenCalledWith({});
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockJobs);
    });

    it("should list printing jobs with status filter", async () => {
      const mockJobs = [
        { _id: new mongoose.Types.ObjectId(), jobNumber: "PRINT-001", status: "Queued" },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockJobs);
      (PrintingJob.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

      const result = await PrintingService.listPrintingJobs({ status: "Queued" });

      expect(PrintingJob.find).toHaveBeenCalledWith({ status: "Queued" });
      expect(result).toEqual(mockJobs);
    });

    it("should list printing jobs with multiple filters", async () => {
      const productId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();
      const mockJobs = [
        {
          _id: new mongoose.Types.ObjectId(),
          jobNumber: "PRINT-001",
          status: "Processing",
          productId,
          orderId,
        },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockJobs);
      (PrintingJob.find as jest.Mock) = jest.fn().mockReturnValue({ sort: mockSort });

      const result = await PrintingService.listPrintingJobs({
        status: "Processing",
        productId,
        orderId,
      });

      expect(PrintingJob.find).toHaveBeenCalledWith({
        status: "Processing",
        productId,
        orderId,
      });
      expect(result).toEqual(mockJobs);
    });
  });
});
