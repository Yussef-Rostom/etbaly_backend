/**
 * E2E Test: AI Custom Design (Full AI Workflow)
 * 
 * Prerequisites:
 * - Server must be running on http://localhost:5000
 * - MongoDB, Redis, Slicing Worker, and AI services must be running
 * - ADMIN_ACCESS_TOKEN must be set in .env
 * - Lightning AI services must be configured (text-to-image and image-to-3D URLs)
 * 
 * Run: npm run test:e2e:ai-design
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_ACCESS_TOKEN || '';

// Output directories for generated files
const OUTPUT_DIR = path.join(__dirname, 'output');
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');
const MODELS_3D_DIR = path.join(OUTPUT_DIR, '3d');

// Helper function to download file from URL
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(outputPath);
  
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

describe('E2E: AI Custom Design', () => {
  let api: AxiosInstance;
  let textToImageJobId: string;
  let imageUrl: string;
  let imageFilePath: string;
  let imageTo3dJobId: string;
  let designId: string;
  let slicingJobId: string;
  let orderId: string;
  let printingJobId: string;

  beforeAll(() => {
    if (!ADMIN_TOKEN) {
      throw new Error('ADMIN_ACCESS_TOKEN must be set in .env file');
    }

    // Create output directories if they don't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
    if (!fs.existsSync(MODELS_3D_DIR)) {
      fs.mkdirSync(MODELS_3D_DIR, { recursive: true });
    }

    api = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      validateStatus: () => true // Don't throw on any status
    });

    console.log('\n🚀 Starting E2E Test: AI Custom Design');
    console.log('🌐 Testing against:', BASE_URL);
    console.log('📁 Output directories:');
    console.log('   Images:', IMAGES_DIR);
    console.log('   3D Models:', MODELS_3D_DIR);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  it('Step 1: Generate Image from Text Prompt', async () => {
    console.log('🎨 Step 1/13: Generating image from text prompt...');
    const response = await api.post('/api/v1/ai/text-to-image', {
      prompt: 'A beautiful decorative vase with geometric patterns, modern design, white background, product photography',
      designName: 'AI Generated Vase Image'
    });

    if (response.status !== 201) {
      console.error('   ❌ Text-to-image job failed:', response.status, response.data);
    }

    expect(response.status).toBe(201);
    expect(response.data.data.jobId).toBeDefined();
    
    textToImageJobId = response.data.data.jobId;
    console.log('   ✅ Text-to-image job submitted:', textToImageJobId);
  });

  it('Step 2: Wait for Image Generation', async () => {
    console.log('⏳ Step 2/13: Waiting for image generation...');
    
    if (!textToImageJobId) {
      console.error('   ❌ Cannot wait - textToImageJobId is undefined');
      throw new Error('textToImageJobId is undefined - previous step failed');
    }

    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (!completed && attempts < maxAttempts) {
      const response = await api.get(`/api/v1/ai/job/TEXT_TO_IMAGE/${textToImageJobId}`);
      
      if (response.status !== 200) {
        console.error('   ❌ Failed to get job status:', response.status, response.data);
        throw new Error(`Failed to get job status: ${response.status}`);
      }
      
      const jobData = response.data.data;
      
      if (jobData.state === 'completed' && jobData.completed) {
        completed = true;
        expect(jobData.result).toBeDefined();
        expect(jobData.result.imagePublicUrl).toBeDefined();
        
        imageUrl = jobData.result.imagePublicUrl;
        
        // Download and save the generated image
        const timestamp = Date.now();
        imageFilePath = path.join(IMAGES_DIR, `generated-image-${timestamp}.png`);
        
        console.log('   📥 Downloading generated image...');
        await downloadFile(imageUrl, imageFilePath);
        
        console.log('   ✅ Image generated successfully');
        console.log('   🖼️  Image URL:', imageUrl);
        console.log('   💾 Saved to:', imageFilePath);
      } else if (jobData.state === 'failed' || jobData.failed) {
        throw new Error(`Image generation failed: ${jobData.error || 'Unknown error'}`);
      } else {
        if (attempts % 5 === 0) {
          console.log(`   ⏳ Still processing... (${attempts * 2}s elapsed) - State: ${jobData.state}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      attempts++;
    }

    if (!completed) {
      throw new Error('Image generation timeout - exceeded 2 minutes');
    }

    expect(completed).toBe(true);
  }, 120000); // 2 minute timeout

  it('Step 3: Convert Image to 3D Model', async () => {
    console.log('🎲 Step 3/13: Converting image to 3D model...');
    
    if (!imageFilePath || !fs.existsSync(imageFilePath)) {
      console.error('   ❌ Cannot convert - image file not found:', imageFilePath);
      throw new Error('Image file not found - previous step failed');
    }

    const formData = new FormData();
    formData.append('designName', 'AI Generated 3D Model');
    formData.append('image', fs.createReadStream(imageFilePath));

    const response = await api.post('/api/v1/ai/image-to-3d', formData, {
      headers: formData.getHeaders()
    });

    if (response.status !== 201) {
      console.error('   ❌ Image-to-3D job failed:', response.status, response.data);
    }

    expect(response.status).toBe(201);
    expect(response.data.data.jobId).toBeDefined();
    
    imageTo3dJobId = response.data.data.jobId;
    console.log('   ✅ Image-to-3D job submitted:', imageTo3dJobId);
  }, 30000); // 30 second timeout for upload

  it('Step 4: Wait for 3D Model Generation', async () => {
    console.log('⏳ Step 4/13: Waiting for 3D model generation...');
    
    if (!imageTo3dJobId) {
      console.error('   ❌ Cannot wait - imageTo3dJobId is undefined');
      throw new Error('imageTo3dJobId is undefined - previous step failed');
    }

    let completed = false;
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes max (3D generation takes longer)

    while (!completed && attempts < maxAttempts) {
      const response = await api.get(`/api/v1/ai/job/AI_GENERATION/${imageTo3dJobId}`);
      
      if (response.status !== 200) {
        console.error('   ❌ Failed to get job status:', response.status, response.data);
        throw new Error(`Failed to get job status: ${response.status}`);
      }
      
      const jobData = response.data.data;
      
      if (jobData.state === 'completed' && jobData.completed) {
        completed = true;
        expect(jobData.result).toBeDefined();
        expect(jobData.result.designId).toBeDefined();
        expect(jobData.result.publicUrl).toBeDefined();
        
        designId = jobData.result.designId;
        const modelUrl = jobData.result.publicUrl;
        
        // Download and save the generated 3D model
        const timestamp = Date.now();
        const modelFilePath = path.join(MODELS_3D_DIR, `generated-model-${timestamp}.stl`);
        
        console.log('   📥 Downloading generated 3D model...');
        await downloadFile(modelUrl, modelFilePath);
        
        console.log('   ✅ 3D model generated successfully');
        console.log('   🎲 Design ID:', designId);
        console.log('   🔗 Model URL:', modelUrl);
        console.log('   💾 Saved to:', modelFilePath);
      } else if (jobData.state === 'failed' || jobData.failed) {
        throw new Error(`3D model generation failed: ${jobData.error || 'Unknown error'}`);
      } else {
        if (attempts % 5 === 0) {
          console.log(`   ⏳ Still processing... (${attempts * 2}s elapsed) - State: ${jobData.state}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      attempts++;
    }

    if (!completed) {
      throw new Error('3D model generation timeout - exceeded 3 minutes');
    }

    expect(completed).toBe(true);
  }, 180000); // 3 minute timeout

  it('Step 5: Execute Slicing', async () => {
    console.log('⚙️  Step 5/13: Starting slicing job...');
    
    if (!designId) {
      console.error('   ❌ Cannot start slicing - designId is undefined');
      throw new Error('designId is undefined - previous step failed');
    }

    const response = await api.post('/api/v1/slicing/execute', {
      designId: designId,
      material: 'PLA',
      color: 'Red',
      preset: 'normal',
      scale: 100
    });

    if (response.status !== 200) {
      console.error('   ❌ Slicing job failed:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    expect(response.data.data.jobId).toBeDefined();
    
    slicingJobId = response.data.data.jobId;
    console.log('   ✅ Slicing job started:', slicingJobId);
  });

  it('Step 6: Wait for Slicing', async () => {
    console.log('⏳ Step 6/13: Waiting for slicing to complete...');
    
    if (!slicingJobId) {
      console.error('   ❌ Cannot wait for slicing - slicingJobId is undefined');
      throw new Error('slicingJobId is undefined - previous step failed');
    }

    let completed = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (!completed && attempts < maxAttempts) {
      const response = await api.get(`/api/v1/slicing/status/${slicingJobId}`);
      
      if (response.status !== 200) {
        console.error('   ❌ Failed to get slicing status:', response.status, response.data);
        throw new Error(`Failed to get slicing status: ${response.status}`);
      }
      
      if (response.data.data.status === 'Completed') {
        completed = true;
        console.log('   ✅ Slicing completed successfully');
        console.log('   💰 Price:', response.data.data.calculatedPrice, 'EGP');
        console.log('   ⚖️  Weight:', response.data.data.weight, 'g');
        console.log('   ⏱️  Print Time:', response.data.data.printTime, 'min');
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

    if (!completed) {
      throw new Error('Slicing timeout - exceeded 2 minutes');
    }

    expect(completed).toBe(true);
  }, 120000);

  it('Step 7: Add to Cart', async () => {
    console.log('🛒 Step 7/13: Adding to cart...');
    
    if (!slicingJobId) {
      console.error('   ❌ Cannot add to cart - slicingJobId is undefined');
      throw new Error('slicingJobId is undefined - previous step failed');
    }

    const response = await api.post('/api/v1/cart/items', {
      slicingJobId: slicingJobId,
      quantity: 1
    });

    if (response.status !== 200) {
      console.error('   ❌ Add to cart failed:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    console.log('   ✅ Added to cart successfully');
  });

  it('Step 8: Checkout and Create Order', async () => {
    console.log('💳 Step 8/13: Checking out and creating order...');
    
    const response = await api.post('/api/v1/cart/checkout', {
      shippingAddress: {
        street: '123 Main St',
        city: 'Cairo',
        country: 'Egypt',
        zip: '11511'
      },
      paymentMethod: 'COD'
    });

    if (response.status !== 201) {
      console.error('   ❌ Checkout failed:', response.status, response.data);
    }

    expect(response.status).toBe(201);
    orderId = response.data.data.order._id;
    console.log('   ✅ Order created:', orderId);
  });

  it('Step 9: Admin Gets Pending Printing Jobs', async () => {
    console.log('🔍 Step 9/13: Getting pending printing jobs...');
    
    const response = await api.get('/api/v1/printing/jobs?status=Pending Review');

    if (response.status !== 200) {
      console.error('   ❌ Failed to get printing jobs:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    expect(response.data.data.jobs.length).toBeGreaterThan(0);
    
    printingJobId = response.data.data.jobs[0]._id;
    console.log('   ✅ Found printing job:', printingJobId);
  });

  it('Step 10: Admin Approves Printing Job', async () => {
    console.log('✔️  Step 10/13: Approving printing job...');
    
    if (!printingJobId) {
      console.error('   ❌ Cannot approve - printingJobId is undefined');
      throw new Error('printingJobId is undefined - previous step failed');
    }

    const response = await api.post('/api/v1/printing/review', {
      jobId: printingJobId,
      action: 'approve'
    });

    if (response.status !== 200) {
      console.error('   ❌ Approval failed:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    console.log('   ✅ Printing job approved');
  });

  it('Step 11: Queue the Printing Job', async () => {
    console.log('📋 Step 11/13: Queueing printing job...');
    
    if (!printingJobId) {
      console.error('   ❌ Cannot queue - printingJobId is undefined');
      throw new Error('printingJobId is undefined - previous step failed');
    }

    const response = await api.post('/api/v1/printing/queue', {
      jobId: printingJobId
    });

    if (response.status !== 200) {
      console.error('   ❌ Queue failed:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    console.log('   ✅ Printing job queued');
  });

  it('Step 12: Start Printing', async () => {
    console.log('🖨️  Step 12/13: Starting printing...');
    
    if (!printingJobId) {
      console.error('   ❌ Cannot start printing - printingJobId is undefined');
      throw new Error('printingJobId is undefined - previous step failed');
    }

    const response = await api.post('/api/v1/printing/start', {
      jobId: printingJobId,
      machineId: 'PRINTER-01'
    });

    if (response.status !== 200) {
      console.error('   ❌ Start printing failed:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    console.log('   ✅ Printing started on PRINTER-01');
  });

  it('Step 13: Verify Order Status', async () => {
    console.log('🔍 Step 13/13: Verifying order status...');
    
    if (!orderId) {
      console.error('   ❌ Cannot verify order - orderId is undefined');
      throw new Error('orderId is undefined - previous step failed');
    }

    const response = await api.get(`/api/v1/orders/${orderId}`);

    if (response.status !== 200) {
      console.error('   ❌ Failed to get order:', response.status, response.data);
    }

    expect(response.status).toBe(200);
    console.log('   ✅ Order status verified');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All steps completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
});
