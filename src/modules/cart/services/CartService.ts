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
      Math.random().toString(36).substr(2, 6).toUpperCase();

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
