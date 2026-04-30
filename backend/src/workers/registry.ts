// src/workers/registry.ts
import { Worker, Job, WorkerOptions } from "bullmq";
import { redisConfig } from "#src/configs/redisConfig";
import { queueManager, QUEUE_NAMES } from "#src/utils/queueManager";

export interface BaseJobData {
  jobId: string;
  ownerId: string;
}

export interface AiJobData extends BaseJobData {
  fileId: string;
  imageName: string;
  designName: string;
  mimeType: string;
  correlationId: string;
  sourceJobId?: string; // Optional: ID of TEXT_TO_IMAGE job if chained
}

export interface SlicingJobData extends BaseJobData {
  stlUrl: string;
  designId: string;
  material: string;
  color?: string;
  preset?: 'heavy' | 'normal' | 'draft';
  /** Scale percentage: 1–1000 (100 = original size) */
  scale?: number;
}

export interface PrintingJobData extends BaseJobData {
  gcodeUrl: string;
  designId: string;
}

export interface WorkerConfig<T = any> {
  queueName: string;
  handler: (job: Job<T>) => Promise<any>;
  concurrency?: number;
}

// Store active workers
const activeWorkers: Worker[] = [];

export function registerWorker<T>(config: WorkerConfig<T>): Worker {
  const workerOpts: WorkerOptions = {
    connection: redisConfig,
    concurrency: config.concurrency ?? 1,
  };

  const worker = new Worker<T>(
    config.queueName,
    async (job) => {
      const jobId = (job.data as unknown as BaseJobData).jobId || "no-job-id";
      console.log(`[${jobId}] ⚡ Starting job ${job.id} in ${config.queueName}`);

      try {
        const result = await config.handler(job);
        console.log(`[${jobId}] ✅ Job ${job.id} completed successfully`);
        return result;
      } catch (error: any) {
        console.error(`[${jobId}] ❌ Job ${job.id} failed:`, error.message);
        
        // If max attempts reached, we could manually move this to DLQ, 
        // but BullMQ handles failed jobs. For explicit DLQ routing, check attempts:
        if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
          console.error(`[${jobId}] ☠️ Job ${job.id} exhausted retries. Routing to DLQ.`);
          await queueManager.getDlq().add(`${config.queueName}-failed`, {
            originalJob: job.data,
            error: error.message,
            jobId: jobId,
          });
        }
        
        throw error;
      }
    },
    workerOpts
  );

  activeWorkers.push(worker);
  return worker;
}

export async function shutdownAllWorkers(): Promise<void> {
  console.log(`🛑 Shutting down ${activeWorkers.length} workers...`);
  await Promise.all(activeWorkers.map((w) => w.close()));
  console.log(`✅ All workers shut down safely.`);
}
