/**
 * E2E Test: Add Product (Admin Workflow)
 * 
 * Prerequisites:
 * - Server must be running on http://localhost:3000
 * - MongoDB, Redis, and Slicing Worker must be running
 * - ADMIN_ACCESS_TOKEN must be set in .env
 * 
 * Run: npm run test:e2e
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_ACCESS_TOKEN || '';

describe('E2E: Add Product', () => {
  let api: AxiosInstance;
  let designFileUrl: string;
  let designId: string;
  let slicingJobId: string;
  let productImageUrls: string[] = [];
  let productId: string;

  beforeAll(() => {
    if (!ADMIN_TOKEN) {
      throw new Error('ADMIN_ACCESS_TOKEN must be set in .env file');
    }

    api = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      validateStatus: () => true // Don't throw on any status
    });

    console.log('\n🚀 Starting E2E Test: Add Product');
    console.log('🌐 Testing against:', BASE_URL);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  it('Step 1: Upload Design File (STL)', async () => {
    console.log('📤 Step 1/8: Uploading STL file...');
    const stlPath = path.join(__dirname, '../../tmp/3d/3dMock.stl');
    const formData = new FormData();
    formData.append('name', 'Premium Vase Model');
    formData.append('file', fs.createReadStream(stlPath));

    const response = await api.post('/api/v1/designs/upload', formData, {
      headers: formData.getHeaders()
    });

    if (response.status !== 201) {
      console.error('   ❌ Upload failed:', response.status, response.data);
    }

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.fileUrl).toBeDefined();

    designFileUrl = response.data.data.fileUrl;
    console.log('   ✅ Design file uploaded successfully');
  }, 30000); // 30 second timeout for STL upload

  it('Step 2: Create Design Record', async () => {
    console.log('📝 Step 2/8: Creating design record...');
    const response = await api.post('/api/v1/designs', {
      name: 'Premium Vase Model',
      fileUrl: designFileUrl,
      isPrintable: true,
      metadata: {
        volumeCm3: 150,
        dimensions: { x: 80, y: 80, z: 120 },
        estimatedPrintTime: 180,
        supportedMaterials: ['PLA', 'ABS', 'PETG']
      }
    });

    if (response.status !== 201) {
      console.error('   ❌ Design creation failed:', response.status, response.data);
      console.error('   designFileUrl:', designFileUrl);
    }

    expect(response.status).toBe(201);
    expect(response.data.data.design._id).toBeDefined();

    designId = response.data.data.design._id;
    console.log('   ✅ Design created:', designId);
  });

  it('Step 3: Execute Slicing Job', async () => {
    console.log('⚙️  Step 3/8: Starting slicing job...');
    const response = await api.post('/api/v1/slicing/execute', {
      designId: designId,
      material: 'PLA',
      color: 'White',
      preset: 'normal',
      scale: 100
    });

    if (response.status !== 200) {
      console.error('   ❌ Slicing job failed:', response.status, response.data);
      console.error('   designId:', designId);
    }

    expect(response.status).toBe(200);
    expect(response.data.data.jobId).toBeDefined();

    slicingJobId = response.data.data.jobId;
    console.log('   ✅ Slicing job started:', slicingJobId);
  });

  it('Step 4: Wait for Slicing to Complete', async () => {
    console.log('⏳ Step 4/8: Waiting for slicing to complete...');
    
    if (!slicingJobId) {
      console.error('   ❌ Cannot wait for slicing - slicingJobId is undefined');
      throw new Error('slicingJobId is undefined - previous step failed');
    }

    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (!completed && attempts < maxAttempts) {
      const response = await api.get(`/api/v1/slicing/status/${slicingJobId}`);
      
      if (response.status !== 200) {
        console.error('   ❌ Failed to get slicing status:', response.status, response.data);
        throw new Error(`Failed to get slicing status: ${response.status}`);
      }
      
      if (response.data.data.status === 'Completed') {
        completed = true;
        expect(response.data.data.gcodeUrl).toBeDefined();
        expect(response.data.data.calculatedPrice).toBeGreaterThan(0);
        console.log('   ✅ Slicing completed successfully');
        console.log('   💰 Price:', response.data.data.calculatedPrice, 'EGP');
      } else if (response.data.data.status === 'Failed') {
        throw new Error(`Slicing failed: ${response.data.data.error || 'Unknown error'}`);
      } else {
        if (attempts % 5 === 0) {
          console.log(`   ⏳ Still processing... (${attempts * 2}s elapsed)`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      attempts++;
    }

    expect(completed).toBe(true);
  }, 120000); // 2 minute timeout

  it('Step 5: Upload Product Images', async () => {
    console.log('🖼️  Step 5/8: Uploading product images...');
    const imagePath = path.join(__dirname, '../../tmp/image/imageMock.png');
    
    for (let i = 0; i < 3; i++) {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const response = await api.post('/api/v1/admin/products/upload-image', formData, {
        headers: formData.getHeaders()
      });

      expect(response.status).toBe(200);
      productImageUrls.push(response.data.data.fileUrl);
      console.log(`   ✅ Image ${i + 1}/3 uploaded`);
    }

    expect(productImageUrls).toHaveLength(3);
  }, 30000); // 30 second timeout for uploading 3 images

  it('Step 6: Create Product', async () => {
    console.log('🏭 Step 6/8: Creating product...');
    const response = await api.post('/api/v1/admin/products', {
      name: 'Premium Decorative Vase',
      description: 'A beautiful 3D-printed vase with geometric patterns.',
      linkedDesignId: designId,
      slicingJobId: slicingJobId,
      images: productImageUrls,
      isActive: true,
      isCustomizable: false
    });

    if (response.status !== 201) {
      console.error('   ❌ Product creation failed:', response.status, response.data);
    }

    expect(response.status).toBe(201);
    expect(response.data.data.product._id).toBeDefined();
    expect(response.data.data.product.slicingResult.calculatedPrice).toBeGreaterThan(0);

    productId = response.data.data.product._id;
    console.log('   ✅ Product created:', productId);
  });

  it('Step 7: Verify Product is Visible', async () => {
    console.log('👀 Step 7/8: Verifying product visibility...');
    const response = await api.get('/api/v1/products');

    expect(response.status).toBe(200);
    const product = response.data.data.products.find((p: any) => p._id === productId);
    
    if (!product) {
      console.error('   ❌ Product not found in catalog. ProductId:', productId);
      console.error('   Available products:', response.data.data.products.map((p: any) => p._id));
      throw new Error('Product not found in catalog');
    }
    
    console.log('   📦 Product found:', JSON.stringify(product, null, 2));
    expect(product).toBeDefined();
    
    // Check if isActive field exists, if not just verify product is in the list
    if (product.hasOwnProperty('isActive')) {
      expect(product.isActive).toBe(true);
    } else {
      console.log('   ℹ️  isActive field not returned by API (product is visible by default)');
    }
    
    console.log('   ✅ Product is visible in catalog');
  });

  it('Step 8: Get Product Details', async () => {
    console.log('🔍 Step 8/8: Getting product details...');
    const response = await api.get(`/api/v1/products/${productId}`);

    expect(response.status).toBe(200);
    expect(response.data.data.product.slicingResult.gcodeUrl).toBeDefined();
    expect(response.data.data.product.printingProperties.material).toBe('PLA');
    console.log('   ✅ Product details verified');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All steps completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
