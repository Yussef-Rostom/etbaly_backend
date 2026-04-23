import { AiGenerationService } from "../services/aiGenerationService";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";
import { AppError } from "#src/utils/AppError";

// Mock the queueManager
jest.mock("#src/utils/queueManager", () => ({
  queueManager: {
    getQueue: jest.fn(),
  },
  QUEUE_NAMES: {
    AI_GENERATION: "AI_GENERATION",
    TEXT_TO_IMAGE: "TEXT_TO_IMAGE",
  },
}));

// Mock the drive utility
jest.mock("#src/utils/drive", () => ({
  uploadImage: jest.fn(),
}));

describe("AiGenerationService", () => {
  describe("getJobStatus", () => {
    const mockJobId = "test-job-123";
    const mockUserId = "user-456";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Feature: dual-mode-ai-generation, Requirement 8.1
    it("should find job in AI_GENERATION queue when specified", async () => {
      const mockJob = {
        id: mockJobId,
        data: { ownerId: mockUserId, designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("waiting"),
        progress: 0,
        failedReason: null,
        timestamp: Date.now(),
      };

      const mockAiQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockAiQueue);

      const result = await AiGenerationService.getJobStatus(
        mockJobId, 
        mockUserId, 
        QUEUE_NAMES.AI_GENERATION
      );

      expect(queueManager.getQueue).toHaveBeenCalledWith(QUEUE_NAMES.AI_GENERATION);
      expect(mockAiQueue.getJob).toHaveBeenCalledWith(mockJobId);
      expect(result.jobId).toBe(mockJobId);
      expect(result.queueName).toBe(QUEUE_NAMES.AI_GENERATION);
      expect(result.state).toBe("waiting");
    });

    // Feature: dual-mode-ai-generation, Requirement 8.1
    it("should find job in TEXT_TO_IMAGE queue when specified", async () => {
      const mockJob = {
        id: mockJobId,
        data: { ownerId: mockUserId, designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("active"),
        progress: 50,
        failedReason: null,
        timestamp: Date.now(),
      };

      const mockTextQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockTextQueue);

      const result = await AiGenerationService.getJobStatus(
        mockJobId, 
        mockUserId, 
        QUEUE_NAMES.TEXT_TO_IMAGE
      );

      expect(queueManager.getQueue).toHaveBeenCalledWith(QUEUE_NAMES.TEXT_TO_IMAGE);
      expect(mockTextQueue.getJob).toHaveBeenCalledWith(mockJobId);
      expect(result.jobId).toBe(mockJobId);
      expect(result.queueName).toBe(QUEUE_NAMES.TEXT_TO_IMAGE);
      expect(result.state).toBe("active");
      expect(result.progress).toBe(50);
    });

    // Feature: dual-mode-ai-generation, Requirement 8.1
    it("should throw 404 error when job not found in specified queue", async () => {
      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(null),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

      await expect(
        AiGenerationService.getJobStatus(mockJobId, mockUserId, QUEUE_NAMES.AI_GENERATION)
      ).rejects.toThrow(AppError);

      await expect(
        AiGenerationService.getJobStatus(mockJobId, mockUserId, QUEUE_NAMES.AI_GENERATION)
      ).rejects.toThrow("Job not found");

      expect(mockQueue.getJob).toHaveBeenCalledWith(mockJobId);
    });

    // Feature: dual-mode-ai-generation
    it("should throw 400 error for invalid queue name", async () => {
      await expect(
        AiGenerationService.getJobStatus(mockJobId, mockUserId, "INVALID_QUEUE" as any)
      ).rejects.toThrow(AppError);

      await expect(
        AiGenerationService.getJobStatus(mockJobId, mockUserId, "INVALID_QUEUE" as any)
      ).rejects.toThrow("Invalid queue name");
    });

    // Feature: dual-mode-ai-generation, Requirement 8.5
    it("should throw 403 error when user does not own the job", async () => {
      const mockJob = {
        id: mockJobId,
        data: { ownerId: "different-user-789", designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("waiting"),
        progress: 0,
        failedReason: null,
        timestamp: Date.now(),
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

      await expect(
        AiGenerationService.getJobStatus(mockJobId, mockUserId, QUEUE_NAMES.AI_GENERATION)
      ).rejects.toThrow(AppError);

      await expect(
        AiGenerationService.getJobStatus(mockJobId, mockUserId, QUEUE_NAMES.AI_GENERATION)
      ).rejects.toThrow("You do not have permission to view this job");
    });

    // Feature: dual-mode-ai-generation, Requirement 8.2
    it("should return progress percentage for active jobs", async () => {
      const mockJob = {
        id: mockJobId,
        data: { ownerId: mockUserId, designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("active"),
        progress: 75,
        failedReason: null,
        timestamp: Date.now(),
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

      const result = await AiGenerationService.getJobStatus(
        mockJobId, 
        mockUserId, 
        QUEUE_NAMES.AI_GENERATION
      );

      expect(result.state).toBe("active");
      expect(result.progress).toBe(75);
      expect(result.processing).toBe(true);
    });

    // Feature: dual-mode-ai-generation, Requirement 8.3
    it("should return completion data for completed AI_GENERATION jobs", async () => {
      const mockReturnValue = {
        success: true,
        designId: "design-123",
        fileId: "file-456",
        publicUrl: "https://example.com/file.stl",
        isMock: false,
      };

      const mockJob = {
        id: mockJobId,
        data: { ownerId: mockUserId, designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("completed"),
        progress: 100,
        failedReason: null,
        timestamp: Date.now(),
        returnvalue: mockReturnValue,
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

      const result = await AiGenerationService.getJobStatus(
        mockJobId, 
        mockUserId, 
        QUEUE_NAMES.AI_GENERATION
      );

      expect(result.state).toBe("completed");
      expect(result.completed).toBe(true);
      expect(result.result).toEqual(mockReturnValue);
    });

    // Feature: dual-mode-ai-generation, Requirement 8.3
    it("should return completion data for completed TEXT_TO_IMAGE jobs", async () => {
      const mockReturnValue = {
        success: true,
        imageFileId: "image-123",
        imagePublicUrl: "https://example.com/image.png",
      };

      const mockJob = {
        id: mockJobId,
        data: { ownerId: mockUserId, designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("completed"),
        progress: 100,
        failedReason: null,
        timestamp: Date.now(),
        returnvalue: mockReturnValue,
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

      const result = await AiGenerationService.getJobStatus(
        mockJobId, 
        mockUserId, 
        QUEUE_NAMES.TEXT_TO_IMAGE
      );

      expect(result.state).toBe("completed");
      expect(result.completed).toBe(true);
      expect(result.result).toEqual(mockReturnValue);
    });

    // Feature: dual-mode-ai-generation, Requirement 8.4
    it("should return error message for failed jobs", async () => {
      const mockJob = {
        id: mockJobId,
        data: { ownerId: mockUserId, designName: "Test Design" },
        getState: jest.fn().mockResolvedValue("failed"),
        progress: 50,
        failedReason: "Lightning AI service unavailable",
        timestamp: Date.now(),
      };

      const mockQueue = {
        getJob: jest.fn().mockResolvedValue(mockJob),
      };

      (queueManager.getQueue as jest.Mock).mockReturnValue(mockQueue);

      const result = await AiGenerationService.getJobStatus(
        mockJobId, 
        mockUserId, 
        QUEUE_NAMES.AI_GENERATION
      );

      expect(result.state).toBe("failed");
      expect(result.failed).toBe(true);
      expect(result.error).toBe("Lightning AI service unavailable");
    });
  });
});
