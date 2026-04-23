import cron from "node-cron";
import mongoose from "mongoose";

// Assuming User model has a verified field
const User = mongoose.model("User");

export const startCleanupJob = () => {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("🧹 Running cron job: Unverified User Cleanup");
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const result = await User.deleteMany({
        isVerified: false,
        createdAt: { $lt: twoDaysAgo }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} unverified users.`);
    } catch (error) {
      console.error("❌ Error in cleanup script:", error);
    }
  });

  console.log("⏱️  Cron job initialized: Unverified User Cleanup (Runs daily at midnight)");
};
