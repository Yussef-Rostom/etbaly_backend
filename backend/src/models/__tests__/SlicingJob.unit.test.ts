import mongoose from "mongoose";
import { SlicingJob } from "../SlicingJob";

describe("SlicingJob Model", () => {
  describe("Required Fields Validation", () => {
    it("should reject when designId is not provided", async () => {
      const job = new SlicingJob({
        userId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow();
    });

    it("should reject when userId is not provided", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow();
    });

    it("should accept when both designId and userId are provided", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
    });
  });

  describe("Optional Fields", () => {
    it("should accept slicing job with stlFileUrl and fileName", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
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
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        stlFileUrl: "https://example.com/model.stl",
        gcodeUrl: "https://example.com/output.gcode",
        status: "Completed",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.gcodeUrl).toBe("https://example.com/output.gcode");
    });

    it("should accept slicing job with material, color, preset, and scale", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        material: "PLA",
        color: "Red",
        preset: "normal",
        scale: 150,
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.material).toBe("PLA");
      expect(job.color).toBe("Red");
      expect(job.preset).toBe("normal");
      expect(job.scale).toBe(150);
    });

    it("should accept slicing job with weight, dimensions, printTime, and calculatedPrice", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        weight: 45.5,
        dimensions: { width: 100, height: 50, depth: 75 },
        printTime: 180,
        calculatedPrice: 31.14,
        status: "Completed",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.weight).toBe(45.5);
      expect(job.dimensions?.width).toBe(100);
      expect(job.dimensions?.height).toBe(50);
      expect(job.dimensions?.depth).toBe(75);
      expect(job.printTime).toBe(180);
      expect(job.calculatedPrice).toBe(31.14);
    });

    it("should accept slicing job with copiedFromJobId", async () => {
      const originalJobId = new mongoose.Types.ObjectId();
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        copiedFromJobId: originalJobId,
        status: "Completed",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.copiedFromJobId).toEqual(originalJobId);
    });

    it("should accept order-based slicing job", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
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
          designId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          status,
        });

        await expect(job.validate()).resolves.not.toThrow();
        expect(job.status).toBe(status);
      }
    });

    it("should reject invalid status values", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        status: "InvalidStatus" as any,
      });

      await expect(job.validate()).rejects.toThrow();
    });
  });

  describe("Preset Enum", () => {
    it("should accept valid preset values", async () => {
      const presets = ["heavy", "normal", "draft"];

      for (const preset of presets) {
        const job = new SlicingJob({
          designId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          preset,
          status: "Queued",
        });

        await expect(job.validate()).resolves.not.toThrow();
        expect(job.preset).toBe(preset);
      }
    });

    it("should accept null preset", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        preset: null,
        status: "Queued",
      });

      await expect(job.validate()).resolves.not.toThrow();
    });
  });

  describe("Scale Validation", () => {
    it("should accept scale within valid range (1-1000)", async () => {
      const validScales = [1, 50, 100, 500, 1000];

      for (const scale of validScales) {
        const job = new SlicingJob({
          designId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
          scale,
          status: "Queued",
        });

        await expect(job.validate()).resolves.not.toThrow();
        expect(job.scale).toBe(scale);
      }
    });

    it("should reject scale below minimum (< 1)", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        scale: 0,
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow();
    });

    it("should reject scale above maximum (> 1000)", async () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        scale: 1001,
        status: "Queued",
      });

      await expect(job.validate()).rejects.toThrow();
    });
  });

  describe("Schema Structure", () => {
    it("should have indexes on designId, userId, orderId, status, material, preset, and copiedFromJobId", () => {
      const indexes = SlicingJob.schema.indexes();
      const indexFields = indexes.map((index: any) => Object.keys(index[0])[0]);

      expect(indexFields).toContain("designId");
      expect(indexFields).toContain("userId");
      expect(indexFields).toContain("orderId");
      expect(indexFields).toContain("status");
      expect(indexFields).toContain("material");
      expect(indexFields).toContain("preset");
      expect(indexFields).toContain("copiedFromJobId");
    });

    it("should have compound index for deduplication", () => {
      const indexes = SlicingJob.schema.indexes();
      const compoundIndex = indexes.find((index: any) => 
        index[0].designId && index[0].material && index[0].preset && index[0].scale && index[0].status
      );

      expect(compoundIndex).toBeDefined();
    });

    it("should have timestamps enabled", () => {
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        status: "Queued",
      });

      expect(job.schema.options.timestamps).toBe(true);
    });
  });

  describe("Timestamps", () => {
    it("should have startedAt and finishedAt as optional dates", async () => {
      const now = new Date();
      const job = new SlicingJob({
        designId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        startedAt: now,
        finishedAt: now,
        status: "Completed",
      });

      await expect(job.validate()).resolves.not.toThrow();
      expect(job.startedAt).toEqual(now);
      expect(job.finishedAt).toEqual(now);
    });
  });
});
