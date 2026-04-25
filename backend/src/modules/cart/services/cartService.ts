import { Types, Schema } from "mongoose";
import { Cart, ICart } from "#src/models/Cart";
import { Product } from "#src/models/Product";
import { Design } from "#src/models/Design";
import { Material } from "#src/models/Material";
import { IOrder } from "#src/models/Order";
import { User } from "#src/models/User";
import { AppError } from "#src/utils/AppError";
import { OrderService } from "#src/modules/order/services/orderService";
import {
  AddCartItemInput,
  UpdateCartItemInput,
  CheckoutInput,
} from "#src/modules/cart/validators/cartValidators";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class CartService {
  /**
   * Resolve unit price using material type string instead of materialId.
   * Looks up material by type (e.g. "PLA") from printingProperties.material.
   */
  private static async resolveUnitPrice(
    itemType: "Product" | "Design",
    itemRefId: string,
    materialType: string,
  ): Promise<number> {
    const material = await Material.findOne({
      type: materialType.toUpperCase() as any,
      isActive: true,
    });
    if (!material) {
      throw new AppError(`Material type "${materialType}" not found or not currently active.`, 404);
    }

    if (itemType === "Product") {
      const product = await Product.findOne({ _id: itemRefId, isActive: true });
      if (!product) {
        throw new AppError("Product not found or not currently active.", 404);
      }
      return product.currentBasePrice;
    }

    // Design — price = volume × pricePerGram
    const design = await Design.findById(itemRefId);
    if (!design) {
      throw new AppError("Design not found.", 404);
    }
    if (design.metadata.volumeCm3 === undefined) {
      throw new AppError("Design volume information is missing.", 400);
    }
    return design.metadata.volumeCm3 * material.currentPricePerGram;
  }

  /**
   * Batch resolve unit prices to avoid N+1 queries.
   */
  private static async batchResolveUnitPrices(
    items: Array<{
      itemType: "Product" | "Design";
      itemRefId: Types.ObjectId;
      materialType: string;
    }>,
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    const productItems = items.filter((i) => i.itemType === "Product");
    const designItems  = items.filter((i) => i.itemType === "Design");

    // Batch fetch all unique material types
    const uniqueTypes = [...new Set(items.map((i) => i.materialType.toUpperCase()))];
    const materials = await Material.find({ type: { $in: uniqueTypes as any[] }, isActive: true });
    const materialPriceMap = new Map<string, number>(materials.map((m) => [m.type as string, m.currentPricePerGram]));

    for (const item of items) {
      if (!materialPriceMap.has(item.materialType.toUpperCase())) {
        throw new AppError(
          `Material type "${item.materialType}" not found or not currently active.`,
          404,
        );
      }
    }

    if (productItems.length > 0) {
      const productIds = productItems.map((i) => i.itemRefId);
      const products = await Product.find({ _id: { $in: productIds }, isActive: true });
      const productPriceMap = new Map(products.map((p) => [p._id.toString(), p.currentBasePrice]));

      for (const item of productItems) {
        const price = productPriceMap.get(item.itemRefId.toString());
        if (price === undefined) {
          throw new AppError(`Product ${item.itemRefId} not found or not currently active.`, 404);
        }
        priceMap.set(item.itemRefId.toString(), price);
      }
    }

    if (designItems.length > 0) {
      const designIds = designItems.map((i) => i.itemRefId);
      const designs = await Design.find({ _id: { $in: designIds } });
      const designMap = new Map(designs.map((d) => [d._id.toString(), d.metadata.volumeCm3]));

      for (const item of designItems) {
        const volumeCm3 = designMap.get(item.itemRefId.toString());
        if (volumeCm3 === undefined) {
          throw new AppError(`Design ${item.itemRefId} not found.`, 404);
        }
        const pricePerGram = materialPriceMap.get(item.materialType.toUpperCase())!;
        const key = `${item.itemRefId.toString()}_${item.materialType.toUpperCase()}`;
        priceMap.set(key, volumeCm3 * pricePerGram);
      }
    }

    return priceMap;
  }

  private static recalculatePricing(cart: ICart): void {
    const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
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
        pricingSummary: { subtotal: 0, taxAmount: 0, shippingCost: 0, discountAmount: 0, total: 0 },
      } as unknown as ICart;
    }
    if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }
    return cart;
  }

  static async addItem(userId: string, dto: AddCartItemInput): Promise<ICart> {
    const unitPrice = await CartService.resolveUnitPrice(
      dto.itemType,
      dto.itemRefId,
      dto.printingProperties.material,
    );

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        pricingSummary: { subtotal: 0, taxAmount: 0, shippingCost: 0, discountAmount: 0, total: 0 },
      });
    } else if (cart.userId.toString() !== userId) {
      throw new AppError("Forbidden: You do not own this cart.", 403);
    }

    const existingItem = cart.items.find((item) => {
      const sameRef = item.itemRefId.equals(new Types.ObjectId(dto.itemRefId));
      const samePrintingProperties =
        JSON.stringify(item.printingProperties) === JSON.stringify(dto.printingProperties);
      return sameRef && samePrintingProperties;
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
        printingProperties: dto.printingProperties,
      } as any);
    }

    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
    return cart;
  }

  static async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemInput): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found.", 404);
    if (cart.userId.toString() !== userId) throw new AppError("Forbidden: You do not own this cart.", 403);

    const item = cart.items.find((i) => i._id.equals(new Types.ObjectId(cartItemId)));
    if (!item) throw new AppError("Cart item not found.", 404);

    item.quantity = dto.quantity;

    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
    return cart;
  }

  static async removeItem(userId: string, cartItemId: string): Promise<ICart> {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError("Cart not found.", 404);
    if (cart.userId.toString() !== userId) throw new AppError("Forbidden: You do not own this cart.", 403);

    const itemIndex = cart.items.findIndex((i) => i._id.equals(new Types.ObjectId(cartItemId)));
    if (itemIndex === -1) throw new AppError("Cart item not found.", 404);

    cart.items.splice(itemIndex, 1);

    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
    return cart;
  }

  static async clearCart(userId: string): Promise<void> {
    const cart = await Cart.findOne({ userId });
    if (!cart) return;
    if (cart.userId.toString() !== userId) throw new AppError("Forbidden: You do not own this cart.", 403);

    cart.items = [];
    CartService.recalculatePricing(cart);
    cart.expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await cart.save();
  }

  static async checkout(userId: string, dto: CheckoutInput): Promise<IOrder> {
    const cart = await CartService.getCart(userId);

    if (!('_id' in cart) || cart.items.length === 0) {
      throw new AppError("Cannot checkout with an empty cart.", 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found.", 404);

    const shippingAddress = dto.shippingAddress;

    // Batch validate and recalculate prices
    const itemsForPriceResolution = cart.items.map((item) => {
      const materialType = item.printingProperties?.material;
      if (!materialType) {
        throw new AppError(`Cart item ${item._id} is missing required printingProperties.material`, 400);
      }
      return { itemType: item.itemType, itemRefId: item.itemRefId, materialType };
    });

    const priceMap = await CartService.batchResolveUnitPrices(itemsForPriceResolution);

    for (const item of cart.items) {
      const materialType = item.printingProperties!.material!.toUpperCase();
      const priceKey = item.itemType === "Product"
        ? item.itemRefId.toString()
        : `${item.itemRefId.toString()}_${materialType}`;

      const currentPrice = priceMap.get(priceKey);
      if (currentPrice === undefined) {
        throw new AppError(`Unable to resolve price for item ${item.itemRefId}.`, 500);
      }
      item.unitPrice = currentPrice;
    }

    CartService.recalculatePricing(cart);

    const orderItems = cart.items.map((item) => ({
      itemType: item.itemType,
      itemRefId: item.itemRefId as unknown as Schema.Types.ObjectId,
      quantity: item.quantity,
      price: item.unitPrice * item.quantity,
      printingProperties: item.printingProperties,
      status: "Queued" as const,
    }));

    const order = await OrderService.createOrder({
      userId,
      items: orderItems,
      shippingAddressSnapshot: shippingAddress,
      paymentMethod: dto.paymentMethod,
      pricingSummary: cart.pricingSummary,
    });

    await Cart.deleteOne({ userId });
    return order;
  }
}