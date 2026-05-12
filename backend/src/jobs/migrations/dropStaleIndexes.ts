import mongoose from "mongoose";

/**
 * Drops stale indexes that no longer exist in the current schema.
 * Runs once after DB connection on startup — safe to re-run (no-op if index is gone).
 */
export const dropStaleIndexes = async (): Promise<void> => {
  const db = mongoose.connection.db;
  if (!db) return;

  const migrations: Array<{ collection: string; index: string }> = [
    { collection: "slicingjobs", index: "jobNumber_1" },
    { collection: "printingjobs", index: "jobNumber_1" },
    { collection: "orders",      index: "orderNumber_1" },
  ];

  for (const { collection, index } of migrations) {
    try {
      const col = db.collection(collection);
      const indexes = await col.indexes();
      if (indexes.some((i) => i.name === index)) {
        await col.dropIndex(index);
        console.log(`✅ Dropped stale index "${index}" from "${collection}"`);
      }
    } catch (err: any) {
      console.warn(`⚠️  Could not drop index "${index}" from "${collection}": ${err.message}`);
    }
  }
};
