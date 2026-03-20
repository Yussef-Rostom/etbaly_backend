import { Types, Schema } from "mongoose";
import { Cart, ICart } from "#src/models/Cart";
import { Product } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { Material } from "#src/models/Material";
import { Order, IOrder } from "#src/models/Order";
import { User } from "#src/models/User";
import { AppError } from "#src/utils/AppError";
import {
  AddCartItemInput,
  UpdateCartItemInput,
  CheckoutInput,
} from "#src/modules/cart/validators/cartValidators";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class CartService {
  private static async resolveUnitPrice(
    itemType: "Product" | "Design",
    itemRefId: string,
    materialId?: string,
  ): Promise<number> {
    if (itemType === "Product") {
      const product = await Product.findOne({
        _id: itemRefId,
        isActive: true,
      });
      if (!product) {
        throw new AppError("Product not found or not currently active.", 404);
      }
      return product.currentBasePrice;
    }

    // Design
    const design = await Design.findById(itemRefId);
    if (!design) {
      throw new AppError("Design not found.", 404);
    }

    const material = await Material.findOne({
      _id: materialId,
      isActive: true,
    });
    if (!material) {
      throw new AppError("Material not found or not currently active.", 404);
    }

    return design.metadata.volumeCm3 * material.currentPricePerGram;
  }

  /**
   * Batch resolve unit prices for multiple cart items to avoid N+1 queries.
   * Fetches all products, designs, and materials in bulk using $in operator.
   */
  private static async batchResolveUnitPrices(
    items: Array<{
      itemType: "Product" | "Design";
      itemRefId: Types.ObjectId;
      materialId?: Types.ObjectId;
    }>,
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    // Separate items by type
    const productItems = items.filter((item) => item.itemType === "Product");
    const designItems = items.filter((item) => item.itemType === "Design");

    // Batch fetch products
    if (productItems.length > 0) {
      const productIds = productItems.map((item) => item.itemRefId);
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
      });

      const productPriceMap = new Map(
        products.map((p) => [p._id.toString(), p.currentBasePrice]),
      );

      for (const item of productItems) {
        const price = productPriceMap.get(item.itemRefId.toString());
        if (price === undefined) {
          throw new AppError(
            `Product ${item.itemRefId} not found or not currently active.`,
            404,
          );
        }
        priceMap.set(item.itemRefId.toString(), price);
      }
    }

    // Batch fetch designs and materials
    if (designItems.length > 0) {
      const designIds = designItems.map((item) => item.itemRefId);
      const materialIds = designItems
        .filter((item) => item.materialId)
        .map((item) => item.materialId!);

      const [designs, materials] = await Promise.all([
        Design.find({ _id: { $in: designIds } }),
        materialIds.length > 0
          ? Material.find({ _id: { $in: materialIds }, isActive: true })
          : Promise.resolve([]),
      ]);

      const designMap = new Map(
        designs.map((d) => [d._id.toString(), d.metadata.volumeCm3]),
      );
      const materialPriceMap = new Map(
        materials.map((m) => [m._id.toString(), m.currentPricePerGram]),
      );

      for (const item of designItems) {
        const volumeCm3 = designMap.get(item.itemRefId.toString());
        if (volumeCm3 === undefined) {
          throw new AppError(`Design ${item.itemRefId} not found.`, 404);
        }

        if (!item.materialId) {
          throw new AppError(
            `Material ID is required for design ${item.itemRefId}.`,
            400,
          );
        }

        const pricePerGram = materialPriceMap.get(item.materialId.toString());
        if (pricePerGram === undefined) {
          throw new AppError(
            `Material ${item.materialId} not found or not currently active.`,
            404,
          );
        }

        const price = volumeCm3 * pricePerGram;
        // Use composite key for designs (designId + materialId)
        const key = `${item.itemRefId.toString()}_${item.materialId.toString()}`;
        priceMap.set(key, price);
      }
    }

    return priceMap;
  }

  private static recalculatePricing(cart: ICart): void {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    cart.pricingSummary.subtotal = subtotal;
    cart.pricingSummary.taxAmount = 0;
    cart.pricingSummary.shippingCost = 0;
    cart.pricingSummary.discountAmount = 0;
    cart.pricingSummary.total = subtotal;
  }

  static async getCart(userId: string): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
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

    // Verify ownership
    if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }

    return cart;
  }

  static async addItem(
    userId: string,
    dto: AddCartItemInput,
  ): Promise<ICart> {
    if (dto.itemType === "Design" && !dto.materialId) {
      throw new AppError("materialId is required for Design items.", 400);
    }

    const unitPrice = await CartService.resolveUnitPrice(
      dto.itemType,
      dto.itemRefId,
      dto.materialId,
    );

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
      // Verify ownership if cart exists
      if (cart.userId.toString() !== userId) {
        throw new AppError("Forbidden: You do not own this cart.", 403);
      }
    }

    const existingItem = cart.items.find((item) => {
      const sameRef = item.itemRefId.equals(new Types.ObjectId(dto.itemRefId));
      const sameMaterial = dto.materialId
        ? item.materialId?.equals(new Types.ObjectId(dto.materialId))
        : !item.materialId;
      const sameCustomization =
        JSON.stringify(item.customization) ===
        JSON.stringify(dto.customization);
      return sameRef && sameMaterial && sameCustomization;
    });

    if (existingItem) {
      existingItem.quantity += dto.quantity;
      existingItem.unitPrice = unitPrice;
    } else {
      cart.items.push({
        itemType: dto.itemType,
        itemRefId: new Types.ObjectId(dto.itemRefId),
        quantity: dto.quantity,
        unitPrice,
        customization: dto.customization,
        materialId: dto.materialId
          ? new Types.ObjectId(dto.materialId)
          : undefined,
      } as any);
    }

    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
    return cart;
  }

  static async updateItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemInput,
  ): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError("Cart not found.", 404);
    }

    // Verify ownership
    if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }

    const item = cart.items.find((i) =>
      i._id.equals(new Types.ObjectId(cartItemId)),
    );
    if (!item) {
      throw new AppError("Cart item not found.", 404);
    }

    item.quantity = dto.quantity;

    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
    return cart;
  }

  static async removeItem(
    userId: string,
    cartItemId: string,
  ): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new AppError("Cart not found.", 404);
    }

    // Verify ownership
    if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }

    const itemIndex = cart.items.findIndex((i) =>
      i._id.equals(new Types.ObjectId(cartItemId)),
    );
    if (itemIndex === -1) {
      throw new AppError("Cart item not found.", 404);
    }

    cart.items.splice(itemIndex, 1);

    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
    return cart;
  }

  static async clearCart(userId: string): Promise<void> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return;
    }

    // Verify ownership
    if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }

    cart.items = [];
    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
  }

  static async checkout(userId: string, dto: CheckoutInput): Promise<IOrder> {
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new AppError("Cannot checkout with an empty cart.", 400);
    }

    // Verify ownership
    if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    const shippingAddress = user.savedAddresses.find((a) =>
      (a as any)._id.equals(new Types.ObjectId(dto.shippingAddressId)),
    );
    if (!shippingAddress) {
      throw new AppError("Shipping address not found.", 404);
    }

    // Batch validate and recalculate prices to ensure they're current
    // This prevents price manipulation and fixes N+1 query issue
    const itemsForPriceResolution = cart.items.map((item) => ({
      itemType: item.itemType,
      itemRefId: item.itemRefId,
      materialId: item.materialId,
    }));

    const priceMap = await CartService.batchResolveUnitPrices(
      itemsForPriceResolution,
    );

    // Update cart items with current prices and recalculate totals
    for (const item of cart.items) {
      let priceKey: string;
      if (item.itemType === "Product") {
        priceKey = item.itemRefId.toString();
      } else {
        // Design items use composite key (designId + materialId)
        priceKey = `${item.itemRefId.toString()}_${item.materialId?.toString()}`;
      }

      const currentPrice = priceMap.get(priceKey);
      if (currentPrice === undefined) {
        throw new AppError(
          `Unable to resolve price for item ${item.itemRefId}.`,
          500,
        );
      }

      item.unitPrice = currentPrice;
    }

    // Recalculate pricing summary with validated prices
    CartService.recalculatePricing(cart);

    const orderItems = cart.items.map((item) => ({
      itemType: item.itemType,
      itemRefId: item.itemRefId as unknown as Schema.Types.ObjectId,
      quantity: item.quantity,
      price: item.unitPrice * item.quantity,
      customization: item.customization,
      materialId: item.materialId as unknown as Schema.Types.ObjectId | undefined,
      status: "Queued" as const,
    }));

    const orderNumber =
      "ORD-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const order = await Order.create({
      orderNumber,
      userId,
      items: orderItems,
      shippingAddressSnapshot: shippingAddress,
      paymentInfo: {
        method: dto.paymentMethod,
        status: "Pending",
        amountPaid: 0,
      },
      pricingSummary: cart.pricingSummary,
      status: "Pending",
    });

    await Cart.deleteOne({ userId });

    return order;
  }
}
