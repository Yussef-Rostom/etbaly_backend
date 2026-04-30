import { Material, IMaterial } from "#src/models/Material";
import { AppError } from "#src/utils/AppError";

export class MaterialService {
  /**
   * Validates that a material with specific type and color exists and is active
   * 
   * @param materialType - Material type to validate (case-insensitive)
   * @param color - Color to validate (required)
   * @returns The validated material document
   * @throws AppError if material is not found or inactive
   */
  static async validateMaterial(materialType: string, color: string): Promise<IMaterial> {
    const normalizedMaterial = materialType.toUpperCase();
    
    const existingMaterial = await Material.findOne({
      type: normalizedMaterial,
      color: color,
      isActive: true,
    });

    if (!existingMaterial) {
      // Get available colors for this material type
      const availableColors = await Material.find({
        type: normalizedMaterial,
        isActive: true,
      }).select('color');
      
      if (availableColors.length === 0) {
        // Material type doesn't exist at all
        const availableMaterials = await this.getAvailableMaterials();
        const uniqueTypes = [...new Set(availableMaterials.map(m => m.type))];
        const materialList = uniqueTypes.join(", ");
        
        throw new AppError(
          `Material type "${materialType}" is not available. Available materials: ${materialList}`,
          400
        );
      }
      
      // Material type exists but color is wrong
      const colorList = availableColors
        .map(m => m.color)
        .join(", ");
      
      throw new AppError(
        `Color "${color}" is not available for material "${materialType}". Available colors: ${colorList}`,
        400
      );
    }

    return existingMaterial;
  }

  /**
   * Gets all active materials
   * 
   * @returns Array of active material documents
   */
  static async getAvailableMaterials(): Promise<IMaterial[]> {
    return await Material.find({ isActive: true }).sort({ type: 1 });
  }

  /**
   * Gets material types as a simple array
   * 
   * @returns Array of material type strings
   */
  static async getAvailableMaterialTypes(): Promise<string[]> {
    const materials = await this.getAvailableMaterials();
    return materials.map(m => m.type);
  }

  /**
   * Gets a single material by type
   * 
   * @param type - Material type (case-insensitive)
   * @returns Material document or null
   */
  static async getMaterialByType(type: string): Promise<IMaterial | null> {
    return await Material.findOne({ type: type.toUpperCase() });
  }

  /**
   * Gets all materials (including inactive)
   * 
   * @returns Array of all material documents
   */
  static async getAllMaterials(): Promise<IMaterial[]> {
    return await Material.find().sort({ type: 1 });
  }

  /**
   * Creates a new material
   * 
   * @param data - Material data
   * @returns Created material document
   */
  static async createMaterial(data: {
    name: string;
    type: string;
    currentPricePerGram: number;
    color: string;
    isActive?: boolean;
  }): Promise<IMaterial> {
    const material = new Material({
      ...data,
      type: data.type.toUpperCase(),
    });
    return await material.save();
  }

  /**
   * Updates a material
   * 
   * @param id - Material ID
   * @param data - Updated material data
   * @returns Updated material document
   */
  static async updateMaterial(
    id: string,
    data: Partial<{
      name: string;
      currentPricePerGram: number;
      color: string;
      isActive: boolean;
    }>
  ): Promise<IMaterial | null> {
    return await Material.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /**
   * Deletes a material
   * 
   * @param id - Material ID
   * @returns Deleted material document
   */
  static async deleteMaterial(id: string): Promise<IMaterial | null> {
    return await Material.findByIdAndDelete(id);
  }
}
