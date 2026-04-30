/**
 * Seed script for the Material collection.
 * Removes all existing materials and inserts fresh data with the new schema.
 * 
 * NEW SCHEMA: type and color are separate fields (no more "PLA - White" in name)
 *
 * Run with:
 *   npm run seed:materials
 */

import "dotenv/config";
import mongoose from "mongoose";
import { env } from "#src/configs/envConfig";
import { Material } from "#src/models/Material";

interface MaterialSeed {
  name: string;
  type: "PLA" | "ABS" | "PETG" | "TPU" | "RESIN";
  color: string;
  currentPricePerGram: number;
  isActive: boolean;
}

const materials: MaterialSeed[] = [
  // ── PLA ──────────────────────────────────────────────────────────────────
  { name: "PLA White Filament", type: "PLA", color: "White", currentPricePerGram: 0.025, isActive: true },
  { name: "PLA Black Filament", type: "PLA", color: "Black", currentPricePerGram: 0.025, isActive: true },
  { name: "PLA Red Filament", type: "PLA", color: "Red", currentPricePerGram: 0.027, isActive: true },
  { name: "PLA Blue Filament", type: "PLA", color: "Blue", currentPricePerGram: 0.027, isActive: true },
  { name: "PLA Green Filament", type: "PLA", color: "Green", currentPricePerGram: 0.027, isActive: true },
  { name: "PLA Yellow Filament", type: "PLA", color: "Yellow", currentPricePerGram: 0.027, isActive: true },
  { name: "PLA Orange Filament", type: "PLA", color: "Orange", currentPricePerGram: 0.027, isActive: true },
  { name: "PLA Purple Filament", type: "PLA", color: "Purple", currentPricePerGram: 0.028, isActive: true },
  { name: "PLA Pink Filament", type: "PLA", color: "Pink", currentPricePerGram: 0.028, isActive: true },
  { name: "PLA Gray Filament", type: "PLA", color: "Gray", currentPricePerGram: 0.026, isActive: true },
  { name: "PLA Gold Filament", type: "PLA", color: "Gold", currentPricePerGram: 0.035, isActive: true },
  { name: "PLA Silver Filament", type: "PLA", color: "Silver", currentPricePerGram: 0.035, isActive: true },
  { name: "PLA Transparent Filament", type: "PLA", color: "Transparent", currentPricePerGram: 0.029, isActive: true },
  { name: "PLA Brown Filament", type: "PLA", color: "Brown", currentPricePerGram: 0.026, isActive: true },
  { name: "PLA Cyan Filament", type: "PLA", color: "Cyan", currentPricePerGram: 0.027, isActive: true },

  // ── ABS ──────────────────────────────────────────────────────────────────
  { name: "ABS White Filament", type: "ABS", color: "White", currentPricePerGram: 0.030, isActive: true },
  { name: "ABS Black Filament", type: "ABS", color: "Black", currentPricePerGram: 0.030, isActive: true },
  { name: "ABS Red Filament", type: "ABS", color: "Red", currentPricePerGram: 0.032, isActive: true },
  { name: "ABS Blue Filament", type: "ABS", color: "Blue", currentPricePerGram: 0.032, isActive: true },
  { name: "ABS Green Filament", type: "ABS", color: "Green", currentPricePerGram: 0.032, isActive: true },
  { name: "ABS Yellow Filament", type: "ABS", color: "Yellow", currentPricePerGram: 0.032, isActive: true },
  { name: "ABS Gray Filament", type: "ABS", color: "Gray", currentPricePerGram: 0.031, isActive: true },
  { name: "ABS Orange Filament", type: "ABS", color: "Orange", currentPricePerGram: 0.032, isActive: true },

  // ── PETG ─────────────────────────────────────────────────────────────────
  { name: "PETG White Filament", type: "PETG", color: "White", currentPricePerGram: 0.028, isActive: true },
  { name: "PETG Black Filament", type: "PETG", color: "Black", currentPricePerGram: 0.028, isActive: true },
  { name: "PETG Red Filament", type: "PETG", color: "Red", currentPricePerGram: 0.030, isActive: true },
  { name: "PETG Blue Filament", type: "PETG", color: "Blue", currentPricePerGram: 0.030, isActive: true },
  { name: "PETG Green Filament", type: "PETG", color: "Green", currentPricePerGram: 0.030, isActive: true },
  { name: "PETG Transparent Filament", type: "PETG", color: "Transparent", currentPricePerGram: 0.032, isActive: true },
  { name: "PETG Orange Filament", type: "PETG", color: "Orange", currentPricePerGram: 0.030, isActive: true },
  { name: "PETG Gray Filament", type: "PETG", color: "Gray", currentPricePerGram: 0.029, isActive: true },

  // ── TPU ──────────────────────────────────────────────────────────────────
  { name: "TPU White Flexible", type: "TPU", color: "White", currentPricePerGram: 0.045, isActive: true },
  { name: "TPU Black Flexible", type: "TPU", color: "Black", currentPricePerGram: 0.045, isActive: true },
  { name: "TPU Red Flexible", type: "TPU", color: "Red", currentPricePerGram: 0.047, isActive: true },
  { name: "TPU Blue Flexible", type: "TPU", color: "Blue", currentPricePerGram: 0.047, isActive: true },
  { name: "TPU Green Flexible", type: "TPU", color: "Green", currentPricePerGram: 0.047, isActive: true },
  { name: "TPU Yellow Flexible", type: "TPU", color: "Yellow", currentPricePerGram: 0.047, isActive: true },
  { name: "TPU Transparent Flexible", type: "TPU", color: "Transparent", currentPricePerGram: 0.050, isActive: true },

  // ── RESIN ────────────────────────────────────────────────────────────────
  { name: "Standard Resin White", type: "RESIN", color: "White", currentPricePerGram: 0.060, isActive: true },
  { name: "Standard Resin Black", type: "RESIN", color: "Black", currentPricePerGram: 0.060, isActive: true },
  { name: "Standard Resin Gray", type: "RESIN", color: "Gray", currentPricePerGram: 0.058, isActive: true },
  { name: "Standard Resin Transparent", type: "RESIN", color: "Transparent", currentPricePerGram: 0.065, isActive: true },
  { name: "Standard Resin Beige", type: "RESIN", color: "Beige", currentPricePerGram: 0.060, isActive: true },
  { name: "Standard Resin Blue", type: "RESIN", color: "Blue", currentPricePerGram: 0.062, isActive: true },
  { name: "Standard Resin Green", type: "RESIN", color: "Green", currentPricePerGram: 0.062, isActive: true },
];

async function seed() {
  const dbName = env.APP_ENV === "production" ? "production" : "development";
  await mongoose.connect(env.MONGODB_URI, { dbName, appName: "Cluster0" });
  console.log(`✅ Connected to MongoDB (${dbName})`);

  // Remove all existing materials
  const deleteResult = await Material.deleteMany({});
  console.log(`🗑️  Removed ${deleteResult.deletedCount} existing materials`);

  // Insert new materials
  const insertedMaterials = await Material.insertMany(materials);
  console.log(`✅ Inserted ${insertedMaterials.length} new materials`);

  // Display summary by type
  const summary = materials.reduce((acc, mat) => {
    acc[mat.type] = (acc[mat.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\n📊 Summary:");
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} colors`);
  });

  console.log("\n✨ Material seed completed successfully!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
