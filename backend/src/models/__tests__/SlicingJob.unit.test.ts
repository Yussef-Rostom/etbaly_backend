import mongoose from "mongoose";
import { SlicingJob } from "../SlicingJob";

describe("SlicingJob Model", () => {
  describe("Validation Hook", () => {
    it("should reject when neither productId nor targetOrderItemId is provided", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-001",
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow(
        "Either productId or targetOrderItemId must be provided"
      );
    });

    it("should reject when both productId and targetOrderItemId are provided", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-002",
        productId: new mongoose.Types.ObjectId(),
        targetOrderItemId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow(
        "Cannot have both productId and targetOrderItemId"
      );
    });

    it("should accept when only productId is provided", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-003",
        productId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
    });

    it("should accept when only targetOrderItemId is provided", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-004",
        targetOrderItemId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
    });
  });

  describe("Optional Fields", () => {
    it("should accept slicing job with stlFileUrl and fileName", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-005",
        productId: new mongoose.Types.ObjectId(),
        stlFileUrl: "https://example.com/model.stl",
        fileName: "model.stl",
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.stlFileUrl).toBe("https://example.com/model.stl");
      expect(job.fileName).toBe("model.stl");
    });

    it("should accept slicing job with gcodeUrl after completion", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-006",
        productId: new mongoose.Types.ObjectId(),
        stlFileUrl: "https://example.com/model.stl",
        gcodeUrl: "https://example.com/output.gcode",
        status: "Completed",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.gcodeUrl).toBe("https://example.com/output.gcode");
    });

    it("should accept order-based slicing job", async () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-007",
        targetOrderItemId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        stlFileUrl: "https://example.com/model.stl",
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.targetOrderItemId).toBeDefined();
      expect(job.orderId).toBeDefined();
    });
  });

  describe("Status Enum", () => {
    it("should accept all valid status values", async () => {
      const statuses: Array<"Queued" | "Processing" | "Completed" | "Failed"> = [
        "Queued",
        "Processing",
        "Completed",
        "Failed",
      ];

      for (const status of statuses) {
        const job = new SlicingJob({
          jobNumber: `SLICE-STATUS-${status}`,
          productId: new mongoose.Types.ObjectId(),
          status,
        });

        await expect(job.validate()).resolves.not.toThrow();
        expect(job.status).toBe(status);
      }
    });
  });

  describe("Schema Structure", () => {
    it("should have indexes on jobNumber, productId, orderId, and status", () => {
      const indexes = SlicingJob.schema.indexes();
      const indexFields = indexes.map((index: any) => Object.keys(index[0])[0]);

      expect(indexFields).toContain("jobNumber");
      expect(indexFields).toContain("productId");
      expect(indexFields).toContain("orderId");
      expect(indexFields).toContain("status");
    });

    it("should have timestamps enabled", () => {
      const job = new SlicingJob({
        jobNumber: "SLICE-008",
        productId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      expect(job.schema.options.timestamps).toBe(true);
    });
  });
});
