import { Types } from "mongoose";

// designIds will be injected at seed time
export const getProductsData = (designIds: Types.ObjectId[]) => [
  {
    name: "Decorative Vase - Standard",
    description: "A beautiful 3D-printed decorative vase, perfect for home decor.",
    currentBasePrice: 29.99,
    isActive: true,
    stockLevel: 50,
    linkedDesignId: designIds[0],
  },
  {
    name: "Phone Stand - Adjustable",
    description: "Ergonomic phone stand, compatible with all phone sizes.",
    currentBasePrice: 12.99,
    isActive: true,
    stockLevel: 100,
    linkedDesignId: designIds[1],
  },
  {
    name: "Cable Organizer - 5 Slot",
    description: "Keep your desk tidy with this flexible cable organizer.",
    currentBasePrice: 7.99,
    isActive: true,
    stockLevel: 200,
    linkedDesignId: designIds[2],
  },
  {
    name: "Miniature Chess Set",
    description: "High-detail resin-printed miniature chess set.",
    currentBasePrice: 89.99,
    isActive: false,
    stockLevel: 10,
    linkedDesignId: designIds[3],
  },
];
