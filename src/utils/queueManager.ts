// Mock implementation for Vercel/Serverless environments
import { processMockJob } from "@/jobs/mocks";

export interface MockJobsOptions {
  attempts?: number;
  backoff?: { type: string; delay: number };
  removeOnComplete?: boolean | { count: number };
  removeOnFail?: boolean | { count: number };
}

export interface MockJobResult {
  id: string;
  queueName: string;
  jobName: string;
  mock: true;
}

export type DispatchResult<TData = unknown, TResult = unknown> = MockJobResult;

/**
 * Dispatch a background job in a platform-agnostic way.
 * This returns the mock ID instantly (to unblock the caller), 
 * while triggering the mock worker asynchronously in the background.
 */
export const dispatchJob = async <TData = unknown, TResult = unknown>(
  queueName: string,
  jobName: string,
  data: TData,
  opts?: MockJobsOptions,
): Promise<DispatchResult<TData, TResult>> => {
  const mockId = `mock-${Date.now()}`;
  
  console.log(
    `📥 [queueManager] Job "${jobName}" added to mock queue "${queueName}" (ID: ${mockId}).`,
  );

  // Trigger the background mock worker WITHOUT awating it, so we return instantly
  processMockJob(queueName, data).catch(err => console.error(err));

  // Instantly return the queued notification
  return {
    id: mockId,
    queueName,
    jobName,
    mock: true,
  };
};
