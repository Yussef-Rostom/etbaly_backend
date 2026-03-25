import { startCleanupJob } from "#src/jobs/crons/cleanupUnverifiedUsers";
import { startUploadGCJob } from "#src/jobs/crons/uploadGarbageCollection";

export const startAllCronJobs = (): void => {
  startCleanupJob();
  startUploadGCJob();
};
