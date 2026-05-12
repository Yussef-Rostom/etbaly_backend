/**
 * Jest Setup File
 * Loads environment variables before running tests
 */

import path from 'path';
import dotenv from 'dotenv';

// Load .env from backend directory (not root)
dotenv.config({ path: path.join(__dirname, '.env') });

// Override API_BASE_URL for local E2E tests
if (!process.env.API_BASE_URL || process.env.API_BASE_URL.includes('yussefrostom')) {
  process.env.API_BASE_URL = 'http://localhost:5000';
  console.log('🔧 Overriding API_BASE_URL to http://localhost:5000 for E2E tests');
}

// Verify critical environment variables are loaded
if (!process.env.ADMIN_ACCESS_TOKEN) {
  console.warn('⚠️  Warning: ADMIN_ACCESS_TOKEN not found in environment');
}

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  Warning: MONGODB_URI not found in environment');
}

console.log('✅ Environment variables loaded for tests');
console.log(`📍 API Base URL: ${process.env.API_BASE_URL}`);
