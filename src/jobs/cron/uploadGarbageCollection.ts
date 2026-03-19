import cron from "node-cron";
import { Upload } from "#src/models/Upload";
import { deleteDriveFile } from "#src/utils/drive";

export const startUploadGCJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("🗑️  Running cron job: Upload Garbage Collection");

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const orphans = await Upload.find({ is_used: false, createdAt: { $lt: cutoff } });

      let deletedCount = 0;

      for (const orphan of orphans) {
        try {
          await deleteDriveFile(orphan.driveFileId);
          await Upload.deleteOne({ _id: orphan._id });
          deletedCount++;
        } catch (err) {
          console.error(`[UploadGC] Failed to delete Drive file ${orphan.driveFileId}:`, err);
          // Skip DB delete — will retry on next run
        }
      }

      console.log(`🗑️  Upload GC complete. Deleted ${deletedCount} orphaned upload(s).`);
    } catch (error) {
      console.error("❌ Unexpected error in Upload GC job:", error);
    }
  });

  console.log("⏱️  Cron job initialized: Upload Garbage Collection (Runs daily at midnight)");
};
