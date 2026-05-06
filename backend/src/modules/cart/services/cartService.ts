import { Types } from "mongoose";
import { Cart, ICart } from "#src/models/Cart";
import { Product } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { SlicingJob } from "#src/models/SlicingJob";
import { IOrder } from "#src/models/Order";
import { User } from "#src/models/User";
import { AppError } from "#src/utils/AppError";
import { OrderService } from "#src/modules/order/services/orderService";
import { MaterialService } from "#src/modules/material/services/materialService";
import { PrintingService } from "#src/modules/printing/services/printingService";
import {
  AddCartItemInput,
  UpdateCartItemInput,
  CheckoutInput,
} from "#src/modules/cart/validators/cartValidators";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class CartService {
  /**
   * Validates that a cart belongs to the specified user
   * @throws AppError if cart doesn't belong to user
   */
  private static validateCartOwnership(cart: ICart, userId: string): void {
    if (cart.userId.toString() !== userId) {
      throw new AppError("You do not have permission to access this cart.", 403);
    }
  }

  /**
   * Recalculates cart pricing summary based on current items
   */
  private static recalculatePricing(cart: ICart): void {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    cart.pricingSummary = {
      subtotal,
      taxAmount: 0, // TODO: Implement tax calculation
      shippingCost: 0, // TODO: Implement shipping calculation
      discountAmount: 0, // TODO: Implement discount logic
      total: subtotal,
    };
  }

  /**
   * Updates cart expiration date to 30 days from now
   */
  private static updateExpiration(cart: ICart): void {
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  }

  /**
   * Resolves thumbnail URL for a cart item
   */
  private static async resolveThumbnailUrl(
    itemType: "Product" | "Design",
    itemRefId: string
  ): Promise<string | undefined> {
    if (itemType === "Design") {
      const design = await Design.findById(itemRefId, { thumbnailUrl: 1 });
      return design?.thumbnailUrl;
    }
    
    const product = await Product.findById(itemRefId, { images: 1 });
    return product?.images?.[0];
  }

  /**
   * Back-fills thumbnail URLs for cart items that don't have them
   */
  private static async backfillThumbnails(cart: ICart): Promise<boolean> {
    let hasChanges = false;

    for (const item of cart.items) {
      if (!item.thumbnailUrl) {
        item.thumbnailUrl = await this.resolveThumbnailUrl(
          item.itemType,
          item.itemRefId.toString()
        );
        hasChanges = hasChanges || !!item.thumbnailUrl;
      }
    }

    return hasChanges;
  }

  /**
   * Resolves item information from a slicing job
   */
  private static async resolveFromSlicingJob(slicingJobId: string) {
    const slicingJob = await SlicingJob.findById(slicingJobId);
      
    if (!slicingJob) {
      throw new AppError("Slicing job not found.", 404);
    }

    if (slicingJob.status !== "Completed") {
      throw new AppError("Slicing job is not completed yet.", 400);
    }

    if (!slicingJob.calculatedPrice) {
      throw new AppError("Slicing job does not have a calculated price.", 400);
    }

    // Validate material + color combination exists
    if (slicingJob.material && slicingJob.color) {
      await MaterialService.validateMaterial(slicingJob.material, slicingJob.color);
    }

    // Get design name
    const design = await Design.findById(slicingJob.designId, { name: 1 });
    if (!design) {
      throw new AppError("Design not found.", 404);
    }

    return {
      itemType: "Design" as const,
      itemRefId: slicingJob.designId.toString(),
      itemName: design.name,
      price: slicingJob.calculatedPrice,
      slicingJobId: slicingJob._id,
      printingProperties: {
        material: slicingJob.material,
        color: slicingJob.color,
        scale: slicingJob.scale,
        preset: slicingJob.preset,
      },
    };
  }

  /**
   * Finds a matching slicing job for design with given parameters
   */
  private static async findMatchingSlicingJob(
    designId: string,
    material: string,
    color: string,
    scale?: number,
    preset?: string
  ) {
    const query: any = {
      designId,
      status: "Completed",
      material: material.toUpperCase(),
      color,
    };

    // Match scale - default is 100 or null
    query.scale = (scale !== undefined && scale !== null && scale !== 100)
      ? scale
      : { $in: [100, null] };

    // Match preset - default is "normal"
    query.preset = preset ? preset : { $in: ["normal", null] };

    const slicingJob = await SlicingJob.findOne(query).sort({ finishedAt: -1 });

    if (!slicingJob?.calculatedPrice) {
      const params = [
        `material: ${material}`,
        `color: ${color}`,
        scale && scale !== 100 ? `scale: ${scale}%` : null,
        preset ? `preset: ${preset}` : null,
      ].filter(Boolean).join(", ");
      
      throw new AppError(
        `This design must be sliced with these parameters (${params}) before adding to cart. Please complete slicing first.`,
        400
      );
    }

    return {
      price: slicingJob.calculatedPrice,
      slicingJobId: slicingJob._id,
    };
  }

  /**
   * Resolves item information from manual parameters
   */
  private static async resolveFromManualParams(dto: AddCartItemInput) {
    if (!dto.itemType || !dto.itemRefId) {
      throw new AppError("itemType and itemRefId are required when slicingJobId is not provided.", 400);
    }

    if (!dto.printingProperties?.material || !dto.printingProperties?.color) {
      throw new AppError("Material and color are required when slicingJobId is not provided.", 400);
    }

    const { itemType, itemRefId, printingProperties } = dto;
    // Type narrowing: we've validated these exist above
    const material = printingProperties.material!;
    const color = printingProperties.color!;

    // For Design items, search for matching slicing job
    if (itemType === "Design") {
      await MaterialService.validateMaterial(material, color);

      const design = await Design.findById(itemRefId, { name: 1 });
      if (!design) {
        throw new AppError("Design not found.", 404);
      }

      const { price, slicingJobId } = await this.findMatchingSlicingJob(
        itemRefId,
        material,
        color,
        printingProperties.scale,
        printingProperties.preset
      );

      return {
        itemType,
        itemRefId,
        itemName: design.name,
        price,
        slicingJobId,
        printingProperties,
      };
    }

    // For Product items, get the linked design and find matching slicing job
    const product = await Product.findOne({ _id: itemRefId, isActive: true });
    if (!product) {
      throw new AppError("Product not found or is no longer available.", 404);
    }

    await MaterialService.validateMaterial(material, color);

    const { price, slicingJobId } = await this.findMatchingSlicingJob(
      product.linkedDesignId.toString(),
      material,
      color,
      printingProperties.scale,
      printingProperties.preset
    );

    return {
      itemType,
      itemRefId,
      itemName: product.name,
      price,
      slicingJobId,
      printingProperties,
    };
  }

  /**
   * Checks if an item with the same configuration exists in cart
   */
  private static findExistingItem(
    cart: ICart,
    itemRefId: string,
    printingProperties: any
  ) {
    return cart.items.find((item) => {
      const sameRef = item.itemRefId.equals(new Types.ObjectId(itemRefId));
      const sameConfig =
        JSON.stringify(item.printingProperties) === JSON.stringify(printingProperties);
      return sameRef && sameConfig;
    });
  }

  /**
   * Creates or retrieves a cart for the user
   */
  private static async getOrCreateCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        pricingSummary: {
          subtotal: 0,
          taxAmount: 0,
          shippingCost: 0,
          discountAmount: 0,
          total: 0,
        },
      });
    } else {
      this.validateCartOwnership(cart, userId);
    }

    return cart;
  }

  /**
   * Gets or creates a cart for the specified user
   */
  static async getCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Return empty cart structure (not saved to DB yet)
      return {
        userId: new Types.ObjectId(userId),
        items: [],
        pricingSummary: {
          subtotal: 0,
          taxAmount: 0,
          shippingCost: 0,
          discountAmount: 0,
          total: 0,
        },
      } as unknown as ICart;
    }

    this.validateCartOwnership(cart, userId);

    // Back-fill thumbnails if needed
    const hasChanges = await this.backfillThumbnails(cart);
    if (hasChanges) {
      await cart.save();
    }

    return cart;
  }

  /**
   * Adds an item to the user's cart
   * If item with same configuration exists, increments quantity
   * Supports two modes:
   * 1. Direct slicingJobId - gets all info from the slicing job (itemType, itemRefId, printingProperties, price)
   * 2. Manual parameters - searches for matching slicing job (requires itemType, itemRefId, printingProperties)
   */
  static async addItem(userId: string, dto: AddCartItemInput): Promise<ICart> {
    // Resolve item information based on mode
    const resolved = dto.slicingJobId
      ? await this.resolveFromSlicingJob(dto.slicingJobId)
      : await this.resolveFromManualParams(dto);

    const { itemType, itemRefId, itemName, price, slicingJobId, printingProperties } = resolved;

    // Get thumbnail
    const thumbnailUrl = await this.resolveThumbnailUrl(itemType, itemRefId);

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check if item with same configuration already exists
    const existingItem = this.findExistingItem(cart, itemRefId, printingProperties);

    if (existingItem) {
      // Update existing item
      existingItem.quantity += dto.quantity;
      existingItem.unitPrice = price; // Lock price at time of adding
      if (slicingJobId) {
        existingItem.slicingJobId = slicingJobId;
      }
    } else {
      // Add new item
      cart.items.push({
        itemType,
        itemRefId: new Types.ObjectId(itemRefId),
        itemName,
        quantity: dto.quantity,
        unitPrice: price,
        thumbnailUrl,
        printingProperties,
        slicingJobId,
      } as any);
    }

    this.recalculatePricing(cart);
    this.updateExpiration(cart);
    await cart.save();

    return cart;
  }

  /**
   * Updates the quantity of a cart item
   */
  static async updateItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemInput
  ): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError("Cart not found.", 404);
    }

    this.validateCartOwnership(cart, userId);

    const item = cart.items.find((i) => i._id.equals(new Types.ObjectId(cartItemId)));
    if (!item) {
      throw new AppError("Cart item not found.", 404);
    }

    item.quantity = dto.quantity;

    this.recalculatePricing(cart);
    this.updateExpiration(cart);
    await cart.save();

    return cart;
  }

  /**
   * Removes an item from the cart
   */
  static async removeItem(userId: string, cartItemId: string): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError("Cart not found.", 404);
    }

    this.validateCartOwnership(cart, userId);

    const itemIndex = cart.items.findIndex((i) =>
      i._id.equals(new Types.ObjectId(cartItemId))
    );

    if (itemIndex === -1) {
      throw new AppError("Cart item not found.", 404);
    }

    cart.items.splice(itemIndex, 1);

    this.recalculatePricing(cart);
    this.updateExpiration(cart);
    await cart.save();

    return cart;
  }

  /**
   * Clears all items from the cart
   */
  static async clearCart(userId: string): Promise<void> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return; // Cart doesn't exist, nothing to clear
    }

    this.validateCartOwnership(cart, userId);

    cart.items = [];
    this.recalculatePricing(cart);
    this.updateExpiration(cart);
    await cart.save();
  }

  /**
   * Converts cart to order, creates printing jobs, and clears the cart
   */
  static async checkout(userId: string, dto: CheckoutInput): Promise<IOrder> {
    const cart = await this.getCart(userId);

    // Validate cart has items
    if (!("_id" in cart) || cart.items.length === 0) {
      throw new AppError("Cannot checkout with an empty cart.", 400);
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    // Validate all items have required specifications
    for (const item of cart.items) {
      if (!item.printingProperties?.material) {
        throw new AppError(
          `Cart item is missing required material specification.`,
          400
        );
      }
      if (!item.slicingJobId) {
        throw new AppError(
          `Cart item is missing slicing job reference. Please re-add the item to cart.`,
          400
        );
      }
    }

    // Prepare order items using the prices already in the cart
    const orderItems = cart.items.map((item) => ({
      itemType: item.itemType,
      itemRefId: item.itemRefId as any,
      quantity: item.quantity,
      price: item.unitPrice * item.quantity,
      printingProperties: item.printingProperties,
      status: "Queued" as const,
    }));

    // Create order
    const order = await OrderService.createOrder({
      userId,
      items: orderItems,
      shippingAddressSnapshot: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      pricingSummary: cart.pricingSummary,
    });

    // Create printing jobs for each cart item
    for (const item of cart.items) {
      // Get slicing job details
      const slicingJob = await SlicingJob.findById(item.slicingJobId);
      
      if (!slicingJob || !slicingJob.gcodeUrl) {
        throw new AppError(
          `Slicing job ${item.slicingJobId} not found or missing G-code URL.`,
          400
        );
      }

      // Find the matching order item id
      const orderItem = order.items.find(
        (oi) => oi.itemRefId.toString() === item.itemRefId.toString(),
      );

      // Determine initial status based on item type
      // - Product items: go directly to "Queued" (pre-approved)
      // - Design items: go to "Pending Review" (need approval)
      const initialStatus = item.itemType === "Product" ? "Queued" : "Pending Review";

      // Create one printing job per unit quantity
      for (let i = 0; i < item.quantity; i++) {
        await PrintingService.createPrintingJob({
          slicingJobId: item.slicingJobId!,
          orderId: order._id as any,
          orderItemId: orderItem?._id as any,
          gcodeUrl: slicingJob.gcodeUrl,
          fileName: slicingJob.fileName || `${item.itemRefId}-${i + 1}.gcode`,
          initialStatus,
        });
      }
    }

    // Clear cart after successful order creation
    await Cart.deleteOne({ userId });

    return order;
  }
}
