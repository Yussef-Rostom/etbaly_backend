import "dotenv/config";
import { connectDB, disconnectDB } from "#src/configs/databaseConfig";
import { drive } from "#src/configs/driveConfig";
import { env } from "#src/configs/envConfig";
import { User } from "#src/models/User";
import { Material } from "#src/models/Material";
import { Design } from "#src/models/Design";
import { Product } from "#src/models/Product";
import { Cart } from "#src/models/Cart";
import { Order } from "#src/models/Order";
import { ManufacturingJob } from "#src/models/ManufacturingJob";
import { Upload } from "#src/models/Upload";

const tableMap: Record<string, { model: { deleteMany: Function }; label: string }> = {
  users:            { model: User,            label: "Users" },
  materials:        { model: Material,        label: "Materials" },
  designs:          { model: Design,          label: "Designs" },
  products:         { model: Product,         label: "Products" },
  carts:            { model: Cart,            label: "Carts" },
  orders:           { model: Order,           label: "Orders" },
  manufacturingjobs:{ model: ManufacturingJob,label: "ManufacturingJobs" },
  uploads:          { model: Upload,          label: "Uploads" },
};

// Deletes all FILES inside a folder (and recursively inside subfolders),
// but keeps the folder structure itself intact.
async function clearDriveFolder(folderId: string): Promise<number> {
  let deleted = 0;
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    });

    const files = res.data.files ?? [];

    for (const file of files) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        deleted += await clearDriveFolder(file.id!);
      } else {
        await drive.files.delete({ fileId: file.id! });
        deleted++;
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return deleted;
}

async function clear() {
  await connectDB();

  const args = process.argv.slice(2).filter((a) => a !== "--");
  const targets = args.length > 0 ? args.map((a) => a.toLowerCase()) : null;

  // Validate args
  if (targets) {
    const invalid = targets.filter((t) => !tableMap[t]);
    if (invalid.length) {
      console.error(`❌ Unknown table(s): ${invalid.join(", ")}`);
      console.error(`   Valid tables: ${Object.keys(tableMap).join(", ")}`);
      process.exit(1);
    }
  }

  const clearAll = !targets;
  console.log(`🧹 Starting clear${clearAll ? " (all tables)" : `: ${targets!.join(", ")}`}...\n`);

  // --- Clear MongoDB ---
  const toClear = clearAll ? Object.keys(tableMap) : targets!;
  const results = await Promise.all(toClear.map((t) => tableMap[t].model.deleteMany({})));

  console.log("🗄️  MongoDB cleared:");
  toClear.forEach((t, i) => {
    console.log(`   ${tableMap[t].label.padEnd(18)}: ${results[i].deletedCount}`);
  });

  // --- Clear Google Drive (only on full clear or when uploads is targeted) ---
  if (clearAll || targets!.includes("uploads")) {
    if (!env.DRIVE_FOLDER_ID) {
      console.log("\n⚠️  DRIVE_FOLDER_ID not set — skipping Drive cleanup.");
    } else {
      console.log(`\n☁️  Clearing Drive folder: ${env.DRIVE_FOLDER_ID}`);
      try {
        const count = await clearDriveFolder(env.DRIVE_FOLDER_ID);
        console.log(`   Deleted ${count} file(s) from Drive`);
      } catch (err) {
        console.error("   ❌ Drive cleanup failed:", err);
      }
    }
  }

  console.log("\n✅ Clear complete!");
  await disconnectDB();
}

clear().catch((err) => {
  console.error("❌ Clear failed:", err);
  process.exit(1);
});
