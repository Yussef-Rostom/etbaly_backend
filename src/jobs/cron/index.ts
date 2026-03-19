import { startCleanupJob } from "#src/jobs/cron/cleanupUnverifiedUsers";
import { startUploadGCJob } from "#src/jobs/cron/uploadGarbageCollection";

export const startAllCronJobs = (): void => {
  startCleanupJob();
  startUploadGCJob();
};
