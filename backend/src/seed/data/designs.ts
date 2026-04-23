import { Types } from "mongoose";

// adminId will be injected at seed time
export const getDesignsData = (adminId: Types.ObjectId) => [
  {
    name: "Decorative Vase",
    isPrintable: true,
    fileUrl: "https://drive.google.com/uc?export=view&id=seed_vase_001",
    ownerId: adminId,
    metadata: {
      volumeCm3: 85.5,
      dimensions: { x: 80, y: 80, z: 150 },
      estimatedPrintTime: 240,
      supportedMaterials: ["PLA", "PETG"],
    },
  },
  {
    name: "Phone Stand",
    isPrintable: true,
    fileUrl: "https://drive.google.com/uc?export=view&id=seed_stand_002",
    ownerId: adminId,
    metadata: {
      volumeCm3: 22.3,
      dimensions: { x: 60, y: 40, z: 80 },
      estimatedPrintTime: 90,
      supportedMaterials: ["PLA", "ABS", "PETG"],
    },
  },
  {
    name: "Cable Organizer",
    isPrintable: true,
    fileUrl: "https://drive.google.com/uc?export=view&id=seed_cable_003",
    ownerId: adminId,
    metadata: {
      volumeCm3: 12.1,
      dimensions: { x: 50, y: 30, z: 20 },
      estimatedPrintTime: 45,
      supportedMaterials: ["PLA", "TPU"],
    },
  },
  {
    name: "Miniature Chess Set",
    isPrintable: false,
    fileUrl: "https://drive.google.com/uc?export=view&id=seed_chess_004",
    ownerId: adminId,
    metadata: {
      volumeCm3: 180.0,
      dimensions: { x: 200, y: 200, z: 50 },
      estimatedPrintTime: 600,
      supportedMaterials: ["Resin"],
    },
  },
];
