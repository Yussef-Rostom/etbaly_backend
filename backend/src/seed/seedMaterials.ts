/**
 * Seed script for the Material collection.
 * Idempotent — uses upsert on `name` so it's safe to re-run.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/jobs/seeds/seedMaterials.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { env } from "#src/configs/envConfig";
import { Material } from "#src/models/Material";

interface MaterialSeed {
  name: string;
  type: "PLA" | "ABS" | "PETG" | "TPU" | "Resin";
  currentPricePerGram: number;
  colorHex: string;
  isActive: boolean;
}

const materials: MaterialSeed[] = [
  // ── PLA ──────────────────────────────────────────────────────────────────
  { name: "PLA - White",        type: "PLA",   currentPricePerGram: 0.025, colorHex: "#FFFFFF", isActive: true },
  { name: "PLA - Black",        type: "PLA",   currentPricePerGram: 0.025, colorHex: "#1A1A1A", isActive: true },
  { name: "PLA - Red",          type: "PLA",   currentPricePerGram: 0.025, colorHex: "#E53935", isActive: true },
  { name: "PLA - Blue",         type: "PLA",   currentPricePerGram: 0.025, colorHex: "#1E88E5", isActive: true },
  { name: "PLA - Green",        type: "PLA",   currentPricePerGram: 0.025, colorHex: "#43A047", isActive: true },
  { name: "PLA - Yellow",       type: "PLA",   currentPricePerGram: 0.025, colorHex: "#FDD835", isActive: true },
  { name: "PLA - Orange",       type: "PLA",   currentPricePerGram: 0.025, colorHex: "#FB8C00", isActive: true },
  { name: "PLA - Purple",       type: "PLA",   currentPricePerGram: 0.025, colorHex: "#8E24AA", isActive: true },
  { name: "PLA - Pink",         type: "PLA",   currentPricePerGram: 0.025, colorHex: "#F06292", isActive: true },
  { name: "PLA - Gray",         type: "PLA",   currentPricePerGram: 0.025, colorHex: "#757575", isActive: true },
  { name: "PLA - Silver",       type: "PLA",   currentPricePerGram: 0.028, colorHex: "#C0C0C0", isActive: true },
  { name: "PLA - Gold",         type: "PLA",   currentPricePerGram: 0.030, colorHex: "#FFD700", isActive: true },
  { name: "PLA - Transparent",  type: "PLA",   currentPricePerGram: 0.027, colorHex: "#E0F7FA", isActive: true },
  { name: "PLA - Brown",        type: "PLA",   currentPricePerGram: 0.025, colorHex: "#6D4C41", isActive: true },
  { name: "PLA - Cyan",         type: "PLA",   currentPricePerGram: 0.025, colorHex: "#00ACC1", isActive: true },

  // ── ABS ──────────────────────────────────────────────────────────────────
  { name: "ABS - White",        type: "ABS",   currentPricePerGram: 0.022, colorHex: "#FFFFFF", isActive: true },
  { name: "ABS - Black",        type: "ABS",   currentPricePerGram: 0.022, colorHex: "#1A1A1A", isActive: true },
  { name: "ABS - Red",          type: "ABS",   currentPricePerGram: 0.022, colorHex: "#E53935", isActive: true },
  { name: "ABS - Blue",         type: "ABS",   currentPricePerGram: 0.022, colorHex: "#1E88E5", isActive: true },
  { name: "ABS - Green",        type: "ABS",   currentPricePerGram: 0.022, colorHex: "#43A047", isActive: true },
  { name: "ABS - Yellow",       type: "ABS",   currentPricePerGram: 0.022, colorHex: "#FDD835", isActive: true },
  { name: "ABS - Gray",         type: "ABS",   currentPricePerGram: 0.022, colorHex: "#757575", isActive: true },
  { name: "ABS - Orange",       type: "ABS",   currentPricePerGram: 0.022, colorHex: "#FB8C00", isActive: true },

  // ── PETG ─────────────────────────────────────────────────────────────────
  { name: "PETG - White",       type: "PETG",  currentPricePerGram: 0.030, colorHex: "#FFFFFF", isActive: true },
  { name: "PETG - Black",       type: "PETG",  currentPricePerGram: 0.030, colorHex: "#1A1A1A", isActive: true },
  { name: "PETG - Red",         type: "PETG",  currentPricePerGram: 0.030, colorHex: "#E53935", isActive: true },
  { name: "PETG - Blue",        type: "PETG",  currentPricePerGram: 0.030, colorHex: "#1E88E5", isActive: true },
  { name: "PETG - Green",       type: "PETG",  currentPricePerGram: 0.030, colorHex: "#43A047", isActive: true },
  { name: "PETG - Transparent", type: "PETG",  currentPricePerGram: 0.032, colorHex: "#E0F7FA", isActive: true },
  { name: "PETG - Orange",      type: "PETG",  currentPricePerGram: 0.030, colorHex: "#FB8C00", isActive: true },
  { name: "PETG - Gray",        type: "PETG",  currentPricePerGram: 0.030, colorHex: "#757575", isActive: true },

  // ── TPU ──────────────────────────────────────────────────────────────────
  { name: "TPU - White",        type: "TPU",   currentPricePerGram: 0.045, colorHex: "#FFFFFF", isActive: true },
  { name: "TPU - Black",        type: "TPU",   currentPricePerGram: 0.045, colorHex: "#1A1A1A", isActive: true },
  { name: "TPU - Red",          type: "TPU",   currentPricePerGram: 0.045, colorHex: "#E53935", isActive: true },
  { name: "TPU - Blue",         type: "TPU",   currentPricePerGram: 0.045, colorHex: "#1E88E5", isActive: true },
  { name: "TPU - Green",        type: "TPU",   currentPricePerGram: 0.045, colorHex: "#43A047", isActive: true },
  { name: "TPU - Yellow",       type: "TPU",   currentPricePerGram: 0.045, colorHex: "#FDD835", isActive: true },
  { name: "TPU - Transparent",  type: "TPU",   currentPricePerGram: 0.048, colorHex: "#E0F7FA", isActive: true },

  // ── Resin ─────────────────────────────────────────────────────────────────
  { name: "Resin - White",      type: "Resin", currentPricePerGram: 0.060, colorHex: "#FFFFFF", isActive: true },
  { name: "Resin - Black",      type: "Resin", currentPricePerGram: 0.060, colorHex: "#1A1A1A", isActive: true },
  { name: "Resin - Gray",       type: "Resin", currentPricePerGram: 0.060, colorHex: "#757575", isActive: true },
  { name: "Resin - Transparent",type: "Resin", currentPricePerGram: 0.065, colorHex: "#E0F7FA", isActive: true },
  { name: "Resin - Beige",      type: "Resin", currentPricePerGram: 0.060, colorHex: "#F5F5DC", isActive: true },
  { name: "Resin - Blue",       type: "Resin", currentPricePerGram: 0.060, colorHex: "#1E88E5", isActive: true },
  { name: "Resin - Green",      type: "Resin", currentPricePerGram: 0.060, colorHex: "#43A047", isActive: true },
];

async function seed() {
  const dbName = env.APP_ENV === "production" ? "production" : "development";
  await mongoose.connect(env.MONGODB_URI, { dbName, appName: "Cluster0" });
  console.log(`✅ Connected to MongoDB (${dbName})`);

  let inserted = 0;
  let updated = 0;

  for (const mat of materials) {
    const result = await Material.findOneAndUpdate(
      { name: mat.name },
      mat,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    if (result?.createdAt?.getTime() === result?.updatedAt?.getTime()) {
      inserted++;
    } else {
      updated++;
    }
  }

  console.log(`🌱 Seed complete — ${inserted} inserted, ${updated} updated (${materials.length} total)`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
