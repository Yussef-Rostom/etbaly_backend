import "dotenv/config";
import { connectDB, disconnectDB } from "#src/configs/databaseConfig";
import { User } from "#src/models/User";
import { Material } from "#src/models/Material";
import { Design } from "#src/models/Design";
import { Product } from "#src/models/Product";
import { Cart } from "#src/models/Cart";
import { Order } from "#src/models/Order";
import { ManufacturingJob } from "#src/models/ManufacturingJob";
import { Upload } from "#src/models/Upload";

import { usersData } from "./data/users";
import { materialsData } from "./data/materials";
import { getDesignsData } from "./data/designs";
import { getProductsData } from "./data/products";

const tableMap: Record<string, { model: { deleteMany: Function }; seed?: Function }> = {
  users:            { model: User },
  materials:        { model: Material },
  designs:          { model: Design },
  products:         { model: Product },
  carts:            { model: Cart },
  orders:           { model: Order },
  manufacturingjobs:{ model: ManufacturingJob },
  uploads:          { model: Upload },
};

async function seed() {
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

  const seedAll = !targets;
  console.log(`� Starting seed${seedAll ? " (all tables)" : `: ${targets!.join(", ")}`}...\n`);

  // Clear targeted tables
  const toClear = seedAll ? Object.keys(tableMap) : targets!;
  await Promise.all(toClear.map((t) => tableMap[t].model.deleteMany({})));
  console.log(`�️  Cleared: ${toClear.join(", d")}`);

  // Always seed in dependency order
  if (seedAll || targets!.includes("users")) {
    const users = await User.insertMany(usersData);
    console.log(`👤 Seeded ${users.length} users`);
  }

  if (seedAll || targets!.includes("materials")) {
    const materials = await Material.insertMany(materialsData);
    console.log(`🧱 Seeded ${materials.length} materials`);
  }

  if (seedAll || targets!.includes("designs") || targets!.includes("products")) {
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.error("❌ No admin user found — seed users first.");
      process.exit(1);
    }

    let designIds: any[];

    if (seedAll || targets!.includes("designs")) {
      const designs = await Design.insertMany(getDesignsData(admin._id));
      designIds = designs.map((d) => d._id);
      console.log(`🎨 Seeded ${designs.length} designs`);
    } else {
      // products only — fetch existing designs, auto-seed if none
      designIds = (await Design.find({}).select("_id")).map((d) => d._id);
      if (designIds.length === 0) {
        console.log("⚠️  No designs found — seeding designs first...");
        const designs = await Design.insertMany(getDesignsData(admin._id));
        designIds = designs.map((d) => d._id);
        console.log(`🎨 Auto-seeded ${designs.length} designs`);
      }
    }

    if (seedAll || targets!.includes("products")) {
      const products = await Product.insertMany(getProductsData(designIds));
      console.log(`📦 Seeded ${products.length} products`);
    }
  }

  console.log("\n✅ Seed complete!");
  await disconnectDB();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
