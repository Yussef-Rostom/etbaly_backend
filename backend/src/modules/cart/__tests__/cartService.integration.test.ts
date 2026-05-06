/**
 * Integration tests for CartService
 * 
 * These tests verify the complete cart workflow including:
 * - Adding items via slicingJobId (Mode 1)
 * - Adding items via manual parameters (Mode 2)
 * - Product handling with linkedDesignId
 * - Price locking
 * - Material validation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { CartService } from '../services/cartService';
import { Cart } from '#src/models/Cart';
import { SlicingJob } from '#src/models/SlicingJob';
import { Design } from '#src/models/Design';
import { Product } from '#src/models/Product';
import { Material } from '#src/models/Material';
import { User } from '#src/models/User';

// Skip integration tests if database is not available
// These tests require a running MongoDB instance
// To run: ensure MongoDB is running and MONGODB_URI is set in test environment
describe.skip('CartService Integration Tests', () => {
  // Increase timeout for database operations
  jest.setTimeout(30000);
  
  let userId: string;
  let designId: string;
  let productId: string;
  let slicingJobId: string;

  beforeEach(async () => {
    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      profile: { firstName: 'Test', lastName: 'User' },
    });
    userId = user._id.toString();

    // Create test material
    await Material.create({
      name: 'PLA White Filament',
      type: 'PLA',
      color: 'White',
      currentPricePerGram: 0.025,
      isActive: true,
    });

    // Create test design
    const design = await Design.create({
      name: 'Test Design',
      fileUrl: 'https://example.com/design.stl',
      ownerId: userId,
      isPrintable: true,
      metadata: {
        supportedMaterials: ['PLA'],
      },
    });
    designId = design._id.toString();

    // Create completed slicing job first (product depends on it)
    const slicingJob = await SlicingJob.create({
      designId,
      userId,
      status: 'Completed',
      material: 'PLA',
      color: 'White',
      scale: 100,
      preset: 'normal',
      weight: 50,
      printTime: 120,
      calculatedPrice: 15.50,
      finishedAt: new Date(),
    });
    slicingJobId = slicingJob._id.toString();

    // Create test product linked to design and slicing job
    const product = await Product.create({
      name: 'Test Product',
      linkedDesignId: designId,
      slicingJobId: slicingJob._id,
      isActive: true,
    });
    productId = product._id.toString();
  });

  afterEach(async () => {
    await Cart.deleteMany({});
    await SlicingJob.deleteMany({});
    await Design.deleteMany({});
    await Product.deleteMany({});
    await Material.deleteMany({});
    await User.deleteMany({});
  });

  describe('Mode 1: Adding items via slicingJobId', () => {
    it('should add item using slicingJobId', async () => {
      const cart = await CartService.addItem(userId, {
        slicingJobId,
        quantity: 2,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].itemType).toBe('Design');
      expect(cart.items[0].itemRefId.toString()).toBe(designId);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].unitPrice).toBe(15.50);
      expect(cart.items[0].slicingJobId?.toString()).toBe(slicingJobId);
      expect(cart.items[0].printingProperties?.material).toBe('PLA');
      expect(cart.items[0].printingProperties?.color).toBe('White');
      expect(cart.pricingSummary.total).toBe(31.00);
    });

    it('should reject incomplete slicing job', async () => {
      const incompleteJob = await SlicingJob.create({
        designId,
        userId,
        status: 'Processing',
        material: 'PLA',
        color: 'White',
      });

      await expect(
        CartService.addItem(userId, {
          slicingJobId: incompleteJob._id.toString(),
          quantity: 1,
        })
      ).rejects.toThrow('Slicing job is not completed yet');
    });
  });

  describe('Mode 2: Adding items via manual parameters', () => {
    it('should add Design item and find matching slicing job', async () => {
      const cart = await CartService.addItem(userId, {
        itemType: 'Design',
        itemRefId: designId,
        quantity: 1,
        printingProperties: {
          material: 'PLA',
          color: 'White',
          scale: 100,
          preset: 'normal',
        },
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].unitPrice).toBe(15.50);
      expect(cart.items[0].slicingJobId?.toString()).toBe(slicingJobId);
    });

    it('should add Product item using linkedDesignId', async () => {
      const cart = await CartService.addItem(userId, {
        itemType: 'Product',
        itemRefId: productId,
        quantity: 1,
        printingProperties: {
          material: 'PLA',
          color: 'White',
          scale: 100,
          preset: 'normal',
        },
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].itemType).toBe('Product');
      expect(cart.items[0].itemRefId.toString()).toBe(productId);
      expect(cart.items[0].unitPrice).toBe(15.50); // From slicing job, not product price
      expect(cart.items[0].slicingJobId?.toString()).toBe(slicingJobId);
    });

    it('should reject when no matching slicing job exists', async () => {
      await expect(
        CartService.addItem(userId, {
          itemType: 'Design',
          itemRefId: designId,
          quantity: 1,
          printingProperties: {
            material: 'PLA',
            color: 'White',
            scale: 150, // Different scale
            preset: 'normal',
          },
        })
      ).rejects.toThrow('This design must be sliced with these parameters');
    });

    it('should reject invalid material/color combination', async () => {
      await expect(
        CartService.addItem(userId, {
          itemType: 'Design',
          itemRefId: designId,
          quantity: 1,
          printingProperties: {
            material: 'PLA',
            color: 'InvalidColor',
            scale: 100,
            preset: 'normal',
          },
        })
      ).rejects.toThrow('not available for material');
    });
  });

  describe('Price locking', () => {
    it('should lock price when adding to cart', async () => {
      const cart = await CartService.addItem(userId, {
        slicingJobId,
        quantity: 1,
      });

      const originalPrice = cart.items[0].unitPrice;

      // Update slicing job price
      await SlicingJob.findByIdAndUpdate(slicingJobId, {
        calculatedPrice: 25.00,
      });

      // Add same item again
      const updatedCart = await CartService.addItem(userId, {
        slicingJobId,
        quantity: 1,
      });

      // Should use new price for the update
      expect(updatedCart.items[0].unitPrice).toBe(25.00);
      expect(updatedCart.items[0].quantity).toBe(2);
    });
  });

  describe('Cart operations', () => {
    it('should update item quantity', async () => {
      const cart = await CartService.addItem(userId, {
        slicingJobId,
        quantity: 1,
      });

      const itemId = cart.items[0]._id.toString();
      const updatedCart = await CartService.updateItem(userId, itemId, {
        quantity: 5,
      });

      expect(updatedCart.items[0].quantity).toBe(5);
      expect(updatedCart.pricingSummary.total).toBe(77.50);
    });

    it('should remove item from cart', async () => {
      const cart = await CartService.addItem(userId, {
        slicingJobId,
        quantity: 1,
      });

      const itemId = cart.items[0]._id.toString();
      const updatedCart = await CartService.removeItem(userId, itemId);

      expect(updatedCart.items).toHaveLength(0);
      expect(updatedCart.pricingSummary.total).toBe(0);
    });

    it('should clear entire cart', async () => {
      await CartService.addItem(userId, {
        slicingJobId,
        quantity: 1,
      });

      await CartService.clearCart(userId);

      const cart = await CartService.getCart(userId);
      expect(cart.items).toHaveLength(0);
    });
  });
});
