import { Types } from "mongoose";

/**
 * Seed product data.
 * slicingJobIds are placeholder ObjectIds for seeding purposes only.
 * In production, products are created via the admin workflow:
 *   upload design → create design → upload images → execute slicing → create product
 */
export const getProductsData = (
  designIds: Types.ObjectId[],
  slicingJobIds?: Types.ObjectId[],
) => {
  const jobIds = slicingJobIds ?? designIds.map(() => new Types.ObjectId());

  return [
    {
      name: "Decorative Vase - Standard",
      description: "A beautiful 3D-printed decorative vase, perfect for home decor.",
      isActive: true,
      linkedDesignId: designIds[0],
      slicingJobId: jobIds[0],
      printingProperties: { material: "PLA", preset: "normal", scale: 100 },
    },
    {
      name: "Phone Stand - Adjustable",
      description: "Ergonomic phone stand, compatible with all phone sizes.",
      isActive: true,
      linkedDesignId: designIds[1],
      slicingJobId: jobIds[1],
      printingProperties: { material: "PLA", preset: "draft", scale: 100 },
    },
    {
      name: "Cable Organizer - 5 Slot",
      description: "Keep your desk tidy with this flexible cable organizer.",
      isActive: true,
      linkedDesignId: designIds[2],
      slicingJobId: jobIds[2],
      printingProperties: { material: "PLA", preset: "draft", scale: 100 },
    },
    {
      name: "Miniature Chess Set",
      description: "High-detail resin-printed miniature chess set.",
      isActive: false,
      linkedDesignId: designIds[3],
      slicingJobId: jobIds[3],
      printingProperties: { material: "RESIN", preset: "heavy", scale: 100 },
    },
  ];
};
